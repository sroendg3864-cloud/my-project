/**
 * OpenStreetMap 데이터로 도보 임장 루트를 만든다 — API 키가 전혀 필요 없다.
 *
 * scripts/build-basemaps.mjs 가 저장해 둔 실제 POI(파출소·학교·도서관·마트·공원·역)와
 * 이름 있는 생활도로를 레이어별 체크포인트로 배치한다.
 */
import { Basemap, BasemapPoi } from '@/data/basemap';
import { haversineMeters, DETOUR_FACTOR, LatLng } from '@/lib/route/walk';
import { estimateTotalMinutes, estimateWalkMinutes } from '@/utils/scoring';
import { CheckItem, LayerCategory, RecommendedArea, SimulatedRoute, Waypoint } from '@/types';

const CHECK_TEMPLATES: Record<LayerCategory, Array<Omit<CheckItem, 'id'>>> = {
  SAFETY: [
    { question: 'CCTV·비상벨이 사각지대 없이 설치되어 있나요?', type: 'BOOLEAN' },
    { question: '야간 가로등 밝기는 충분한가요?', type: 'RATING' },
    { question: '골목의 개방감과 체감 치안은 어떤가요?', type: 'RATING' },
    { question: '현장에서 느낀 점을 메모해주세요', type: 'TEXT' },
  ],
  EDUCATION: [
    { question: '차도와 분리된 안전한 통학로가 확보되어 있나요?', type: 'BOOLEAN' },
    { question: '횡단보도·신호 체계는 통학에 충분한가요?', type: 'RATING' },
    { question: '학원가·도서관 등 학습 인프라 접근성은 어떤가요?', type: 'RATING' },
    { question: '통학로에서 발견한 위험 요소를 메모해주세요', type: 'TEXT' },
  ],
  LIVING: [
    { question: '체감 도보 시간이 광고된 역세권 거리와 일치하나요?', type: 'BOOLEAN' },
    { question: '단차·경사 없이 평지 보행이 가능한가요?', type: 'RATING' },
    { question: '마트·병원 등 생활 편의시설 접근성은 어떤가요?', type: 'RATING' },
    { question: '주거 환경에 대한 인상을 메모해주세요', type: 'TEXT' },
  ],
};

/** 루트가 걷기 좋은 범위를 벗어나지 않도록 중심에서의 최대 거리 */
const MAX_RADIUS_M = 850;
const PER_LAYER = 3;

interface Candidate extends LatLng {
  name: string;
  category: LayerCategory;
  key: string;
}

/**
 * 후보들 중 서로 충분히 떨어진 k개를 고른다.
 * (가장 가까운 곳만 3개 고르면 한 블록 안에서 맴도는 경로가 된다)
 */
function pickSpread(candidates: Candidate[], k: number): Candidate[] {
  if (candidates.length <= k) return candidates;
  const picked = [candidates[0]];
  while (picked.length < k) {
    let best: Candidate | null = null;
    let bestScore = -1;
    for (const candidate of candidates) {
      if (picked.includes(candidate)) continue;
      const nearest = Math.min(...picked.map((p) => haversineMeters(p, candidate)));
      if (nearest > bestScore) { bestScore = nearest; best = candidate; }
    }
    if (!best) break;
    picked.push(best);
  }
  return picked;
}

const byDistance = (center: LatLng) => (a: LatLng, b: LatLng) =>
  haversineMeters(center, a) - haversineMeters(center, b);

/** 초등학교를 먼저, 그 다음 그 외 학교 — 통학로 점검이 목적이라서 */
const schoolRank = (poi: BasemapPoi) =>
  poi.n.includes('초등') ? 0 : poi.n.includes('중학') || poi.n.includes('고등') ? 2 : 1;

function collectCandidates(basemap: Basemap): Candidate[] {
  const center = basemap.center;
  const near = <T extends LatLng>(list: T[]) =>
    list.filter((item) => haversineMeters(center, item) <= MAX_RADIUS_M).sort(byDistance(center));

  const pois = (kinds: BasemapPoi['k'][]) => near(basemap.pois.filter((poi) => kinds.includes(poi.k)));

  // --- 주거환경: 역 · 마트 · 공원 ---
  const living: Candidate[] = [];
  const station = pois(['station'])[0];
  if (station) living.push({ ...station, name: `${station.n} 역세권 도보 구간`, category: 'LIVING', key: `st-${station.n}` });
  pois(['supermarket']).slice(0, 3).forEach((poi) =>
    living.push({ ...poi, name: poi.n, category: 'LIVING', key: `sm-${poi.n}` }));
  pois(['park']).slice(0, 3).forEach((poi) =>
    living.push({ ...poi, name: poi.n, category: 'LIVING', key: `pk-${poi.n}` }));

  // --- 교육환경: 학교(초등 우선) · 도서관 ---
  const schools = pois(['school']).sort((a, b) => schoolRank(a) - schoolRank(b));
  const education: Candidate[] = [
    ...schools.slice(0, 4).map((poi) => ({ ...poi, name: `${poi.n} 통학로`, category: 'EDUCATION' as const, key: `sc-${poi.n}` })),
    ...pois(['library']).slice(0, 2).map((poi) => ({ ...poi, name: poi.n, category: 'EDUCATION' as const, key: `lb-${poi.n}` })),
  ];

  // --- 안전환경: 파출소·치안센터가 있으면 우선, 모자라면 이름 있는 생활도로 위에 배치 ---
  const safety: Candidate[] = pois(['police']).slice(0, 3)
    .map((poi) => ({ ...poi, name: poi.n, category: 'SAFETY' as const, key: `po-${poi.n}` }));

  if (safety.length < PER_LAYER) {
    const streets = near(basemap.streets ?? []);
    for (const street of streets) {
      if (safety.length >= PER_LAYER) break;
      if (safety.some((item) => item.name.startsWith(street.n))) continue;
      safety.push({ lat: street.lat, lng: street.lng, name: `${street.n} 야간 보행 구간`, category: 'SAFETY', key: `str-${street.n}` });
    }
  }

  return [
    ...pickSpread(safety, PER_LAYER),
    ...pickSpread(education, PER_LAYER),
    ...pickSpread(living, PER_LAYER),
  ];
}

function orderRoute(start: LatLng, points: Candidate[]): Candidate[] {
  // 최근접 이웃으로 초안을 잡고
  const remaining = [...points];
  const ordered: Candidate[] = [];
  let cursor: LatLng = start;
  while (remaining.length) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    remaining.forEach((point, index) => {
      const distance = haversineMeters(cursor, point);
      if (distance < bestDistance) { bestDistance = distance; bestIndex = index; }
    });
    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    cursor = next;
  }

  // 2-opt로 교차를 편다
  const total = (list: Candidate[]) =>
    list.reduce((sum, point, index) => sum + haversineMeters(index === 0 ? start : list[index - 1], point), 0);
  let best = ordered;
  let bestLength = total(best);
  let improved = true;
  let guard = 0;
  while (improved && guard < 40) {
    improved = false;
    guard += 1;
    for (let i = 0; i < best.length - 1; i += 1) {
      for (let j = i + 1; j < best.length; j += 1) {
        const candidate = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
        const length = total(candidate);
        if (length < bestLength - 1) { best = candidate; bestLength = length; improved = true; }
      }
    }
  }
  return best;
}

/** 실좌표를 0~100 캔버스 좌표로도 넣어 둔다 (지도 없이 그릴 때의 폴백용) */
function canvasCoords(points: LatLng[]) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 1e-6;
  const spanLng = maxLng - minLng || 1e-6;
  return points.map((p) => ({
    x: Number((8 + ((p.lng - minLng) / spanLng) * 84).toFixed(2)),
    y: Number((92 - ((p.lat - minLat) / spanLat) * 84).toFixed(2)),
  }));
}

/**
 * 지도 데이터에서 실제 장소로 루트를 만든다.
 * 레이어별 후보가 모자라면 null을 돌려주고, 호출한 쪽이 시뮬레이션으로 폴백한다.
 */
export function resolveOsmRoute(area: RecommendedArea, basemap: Basemap): SimulatedRoute | null {
  const candidates = collectCandidates(basemap);

  const counts = candidates.reduce<Record<string, number>>((acc, candidate) => {
    acc[candidate.category] = (acc[candidate.category] ?? 0) + 1;
    return acc;
  }, {});
  if (!['SAFETY', 'EDUCATION', 'LIVING'].every((category) => (counts[category] ?? 0) >= 2)) return null;

  const ordered = orderRoute(basemap.center, candidates);
  const canvas = canvasCoords(ordered);

  const waypoints: Waypoint[] = ordered.map((candidate, index) => {
    const id = `${area.recommendedRouteId}-osm-${index + 1}`;
    return {
      id,
      order: index + 1,
      name: candidate.name,
      category: candidate.category,
      x: canvas[index].x,
      y: canvas[index].y,
      lat: candidate.lat,
      lng: candidate.lng,
      checkItems: CHECK_TEMPLATES[candidate.category].map((template, itemIndex) => ({
        ...template,
        id: `${id}-c${itemIndex + 1}`,
      })),
      isCompleted: false,
    };
  });

  const segmentDistances = waypoints.slice(0, -1).map((waypoint, index) =>
    Math.round(haversineMeters(waypoint as LatLng, waypoints[index + 1] as LatLng) * DETOUR_FACTOR));
  const totalDistanceMeters = segmentDistances.reduce((sum, distance) => sum + distance, 0);
  const walkMinutes = estimateWalkMinutes(totalDistanceMeters);

  return {
    routeId: area.recommendedRouteId,
    areaId: area.id,
    waypoints,
    source: 'OSM',
    walkProvider: 'straight-line',
    hasSlopeData: false,
    center: basemap.center,
    pathLegs: waypoints.slice(0, -1).map((waypoint, index) => [
      { lat: waypoint.lat!, lng: waypoint.lng! },
      { lat: waypoints[index + 1].lat!, lng: waypoints[index + 1].lng! },
    ]),
    segmentDistances,
    segmentSlopeFactors: segmentDistances.map(() => 1),
    totalDistanceMeters,
    walkMinutes,
    totalMinutes: estimateTotalMinutes(walkMinutes, waypoints.length),
  };
}
