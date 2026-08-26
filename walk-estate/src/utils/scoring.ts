import { SIMULATED_AREAS, SIMULATION_METERS_PER_UNIT, generateSimulatedWaypoints } from '@/data/simulatedRoutes';
import {
  LayerCategory,
  RecommendationTheme,
  RecommendedArea,
  SimulatedRoute,
  Waypoint,
} from '@/types';

/* ------------------------------------------------------------------ *
 * 2.3 지역 추천 스코어링
 * Score_Area = 0.4·S_Turnover + 0.3·S_Density + 0.3·S_BudgetFit
 * ------------------------------------------------------------------ */
export const AREA_SCORE_WEIGHTS = { turnover: 0.4, density: 0.3, budgetFit: 0.3 };

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** min-max 정규화 — 모든 값이 같으면 중립값 0.5 */
const normalize = (value: number, min: number, max: number): number =>
  max === min ? 0.5 : clamp01((value - min) / (max - min));

export const calculateAreaScore = (
  area: RecommendedArea,
  userMaxAffordable: number,
  allAreas: RecommendedArea[] = SIMULATED_AREAS,
  transactionType: 'BUY' | 'JEONSE' = 'BUY'
): number => {
  const volumes = allAreas.map((a) => a.metrics.tradingVolumeLast3Months);
  const densities = allAreas.map((a) => a.metrics.demandDensity);

  const sTurnover = normalize(
    area.metrics.tradingVolumeLast3Months,
    Math.min(...volumes),
    Math.max(...volumes)
  );
  const sDensity = normalize(
    area.metrics.demandDensity,
    Math.min(...densities),
    Math.max(...densities)
  );

  // S_BudgetFit = 1 - |targetPrice - userMaxAffordable| / userMaxAffordable
  const { min, max } = area.priceRangeByType[transactionType];
  const targetPrice = (min + max) / 2;
  const sBudgetFit =
    userMaxAffordable > 0
      ? clamp01(1 - Math.abs(targetPrice - userMaxAffordable) / userMaxAffordable)
      : 0;

  const score =
    AREA_SCORE_WEIGHTS.turnover * sTurnover +
    AREA_SCORE_WEIGHTS.density * sDensity +
    AREA_SCORE_WEIGHTS.budgetFit * sBudgetFit;

  // 리포트/배지 표기는 5점 만점이 아니라 0~100 스케일로 노출한다.
  return Number((score * 100).toFixed(1));
};

/* ------------------------------------------------------------------ *
 * 2.4 예상 소요 시간
 * estimatedMinutes = ceil(totalRouteDistanceMeters / 80)
 * ------------------------------------------------------------------ */
export const AVG_WALK_SPEED_M_PER_MIN = 80; // 20대 남자 평균 도보 속도 (시속 약 4.8km)
export const CHECKPOINT_AVG_MINUTES = 3;

/** 경사/계단 구간 보정 훅 — 급경사 구간은 slopeFactor(예: 1.2)를 곱해 거리를 보정 */
export const applySlopeAdjustment = (distanceMeters: number, slopeFactor = 1): number =>
  distanceMeters * slopeFactor;

export const estimateWalkMinutes = (totalDistanceMeters: number, slopeFactor = 1): number =>
  Math.ceil(applySlopeAdjustment(totalDistanceMeters, slopeFactor) / AVG_WALK_SPEED_M_PER_MIN);

export const estimateTotalMinutes = (walkMinutes: number, waypointCount: number): number =>
  walkMinutes + waypointCount * CHECKPOINT_AVG_MINUTES;

/** 캔버스 좌표 두 점 사이의 시뮬레이션 거리(m) */
export const distanceBetween = (a: Waypoint, b: Waypoint): number =>
  Math.hypot(b.x - a.x, b.y - a.y) * SIMULATION_METERS_PER_UNIT;

/**
 * 지역 → 시뮬레이션 루트(waypoint + 거리 + 소요 시간).
 * 실제 지도로 전환할 때는 distanceBetween만 haversine으로 교체하면 된다.
 */
export const buildSimulatedRoute = (area: RecommendedArea): SimulatedRoute => {
  const waypoints = generateSimulatedWaypoints(area);
  const segmentDistances: number[] = [];
  const segmentSlopeFactors: number[] = [];

  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const raw = distanceBetween(waypoints[i], waypoints[i + 1]);
    // 언덕이 섞인 동네를 흉내내기 위해 일부 구간에 급경사 계수를 부여 (결정론적)
    const isSteep = (waypoints[i].x + waypoints[i + 1].y) % 5 < 1.6;
    segmentDistances.push(raw);
    segmentSlopeFactors.push(isSteep ? 1.2 : 1);
  }

  const adjustedDistance = segmentDistances.reduce(
    (sum, distance, index) => sum + applySlopeAdjustment(distance, segmentSlopeFactors[index]),
    0
  );
  const totalDistanceMeters = Math.round(
    segmentDistances.reduce((sum, distance) => sum + distance, 0)
  );
  const walkMinutes = estimateWalkMinutes(adjustedDistance);

  return {
    routeId: area.recommendedRouteId,
    areaId: area.id,
    waypoints,
    segmentDistances,
    segmentSlopeFactors,
    totalDistanceMeters,
    walkMinutes,
    totalMinutes: estimateTotalMinutes(walkMinutes, waypoints.length),
  };
};

/* ------------------------------------------------------------------ *
 * 체크포인트 / 종합 평점
 * ------------------------------------------------------------------ */
export const calculateLayerScore = (waypoints: Waypoint[], category: LayerCategory): number => {
  const scores: number[] = [];

  waypoints
    .filter((waypoint) => waypoint.category === category)
    .forEach((waypoint) => {
      waypoint.checkItems.forEach((item) => {
        if (item.type === 'RATING' && typeof item.value === 'number') {
          scores.push(item.value);
        }
        // BOOLEAN은 Yes=5점 / No=2점으로 환산해 레이어 평점에 함께 반영
        if (item.type === 'BOOLEAN' && typeof item.value === 'boolean') {
          scores.push(item.value ? 5 : 2);
        }
      });
    });

  if (scores.length === 0) return 0;
  return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1));
};

export const calculateOverallRating = (waypoints: Waypoint[]): number => {
  const categories: LayerCategory[] = ['SAFETY', 'EDUCATION', 'LIVING'];
  const layerScores = categories
    .map((category) => calculateLayerScore(waypoints, category))
    .filter((score) => score > 0);

  if (layerScores.length === 0) return 0;
  return Number(
    (layerScores.reduce((sum, score) => sum + score, 0) / layerScores.length).toFixed(1)
  );
};

export const calculateLayerScores = (waypoints: Waypoint[]): Record<LayerCategory, number> => ({
  SAFETY: calculateLayerScore(waypoints, 'SAFETY'),
  EDUCATION: calculateLayerScore(waypoints, 'EDUCATION'),
  LIVING: calculateLayerScore(waypoints, 'LIVING'),
});

/* ------------------------------------------------------------------ *
 * 4.6 최소 3개 추천 보장
 * ------------------------------------------------------------------ */
export const recommendAreas = (
  userMaxAffordable: number,
  transactionType: 'BUY' | 'JEONSE',
  preferredTheme?: RecommendationTheme,
  minResults = 3
): RecommendedArea[] => {

  const fitsBudget = (area: RecommendedArea, tolerance: number) => {
    const { min, max } = area.priceRangeByType[transactionType];
    const widenedMin = min * (1 - tolerance);
    const widenedMax = max * (1 + tolerance);
    return userMaxAffordable >= widenedMin && userMaxAffordable <= widenedMax;
  };

  // 1단계: 테마 + 예산 정확 매칭
  let candidates = SIMULATED_AREAS.filter(a =>
    (!preferredTheme || a.theme === preferredTheme) && fitsBudget(a, 0)
  );

  // 2단계: 테마 유지, 예산 허용오차 20% → 40% → 60%로 단계적 완화
  for (const tolerance of [0.2, 0.4, 0.6]) {
    if (candidates.length >= minResults) break;
    candidates = SIMULATED_AREAS.filter(a =>
      (!preferredTheme || a.theme === preferredTheme) && fitsBudget(a, tolerance)
    );
  }

  // 3단계: 테마 조건 제거, 예산만으로 재시도
  if (candidates.length < minResults) {
    candidates = SIMULATED_AREAS.filter(a => fitsBudget(a, 0.6));
  }

  // 4단계: 최종 안전장치 — 그래도 부족하면 Score_Area 상위 N개로 채움
  if (candidates.length < minResults) {
    candidates = [...SIMULATED_AREAS];
  }

  return candidates
    .map(a => ({ area: a, score: calculateAreaScore(a, userMaxAffordable, SIMULATED_AREAS, transactionType) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, Math.max(minResults, 3))
    .map(x => x.area);
};
