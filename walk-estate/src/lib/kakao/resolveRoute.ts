/**
 * 지역 → 실제 도보 임장 루트.
 *
 * 카카오 Local API로 지역의 실제 좌표와 주변 시설(POI)을 찾아 체크포인트를 구성한다.
 * REST 키가 없으면 기존 시뮬레이션 루트를 그대로 돌려주므로, 키 유무와 관계없이 앱은 동작한다.
 */
import 'server-only';
import { CATEGORY_GROUP, KakaoPlace, searchCategory, searchKeyword } from './local';
import { isKakaoLocalEnabled } from './config';
import { resolveWalkPath, haversineMeters, LatLng } from '@/lib/route/walk';
import { buildSimulatedRoute, estimateTotalMinutes, estimateWalkMinutes } from '@/utils/scoring';
import { CheckItem, LayerCategory, RecommendedArea, SimulatedRoute, Waypoint } from '@/types';

/** 카테고리별로 어떤 실제 시설을 체크포인트로 삼을지 */
const LAYER_SOURCES: Record<LayerCategory, Array<{ kind: 'keyword' | 'category'; value: string }>> = {
  SAFETY: [
    { kind: 'keyword', value: '지구대' },
    { kind: 'keyword', value: '파출소' },
    { kind: 'keyword', value: '치안센터' },
  ],
  EDUCATION: [
    { kind: 'keyword', value: '초등학교' },
    { kind: 'category', value: CATEGORY_GROUP.ACADEMY },
    { kind: 'keyword', value: '도서관' },
  ],
  LIVING: [
    { kind: 'category', value: CATEGORY_GROUP.SUBWAY },
    { kind: 'category', value: CATEGORY_GROUP.MART },
    { kind: 'keyword', value: '공원' },
  ],
};

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

const SEARCH_RADIUS_M = 1200;

/** 지역의 기준 좌표 — 대표 역을 먼저 찾고, 실패하면 동 이름으로 재시도 */
async function findCenter(area: RecommendedArea): Promise<LatLng | null> {
  for (const query of [area.stationName, `${area.regionName} ${area.stationName}`, area.regionName]) {
    const [place] = await searchKeyword(query, { size: 1 });
    if (place) return { lat: Number(place.y), lng: Number(place.x) };
  }
  return null;
}

async function findPlaces(category: LayerCategory, center: LatLng): Promise<KakaoPlace[]> {
  const picked: KakaoPlace[] = [];
  const seen = new Set<string>();

  for (const source of LAYER_SOURCES[category]) {
    if (picked.length >= 3) break;
    const places = source.kind === 'keyword'
      ? await searchKeyword(source.value, { x: center.lng, y: center.lat, radius: SEARCH_RADIUS_M, size: 5 })
      : await searchCategory(source.value, { x: center.lng, y: center.lat }, { radius: SEARCH_RADIUS_M, size: 5 });

    for (const place of places) {
      if (picked.length >= 3) break;
      if (seen.has(place.id)) continue;
      seen.add(place.id);
      picked.push(place);
    }
  }
  return picked;
}

/** 출발점에서 가장 가까운 지점을 차례로 잇는 최근접 이웃 정렬 — 걷는 순서를 자연스럽게 만든다 */
function orderByNearestNeighbour<T extends LatLng>(start: LatLng, points: T[]): T[] {
  const remaining = [...points];
  const ordered: T[] = [];
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
  return ordered;
}

/**
 * 2-opt 개선 — 최근접 이웃은 경로가 스스로 교차하는 경우가 많아,
 * 구간 두 개를 뒤집었을 때 총 거리가 줄어들면 계속 뒤집는다.
 */
function twoOpt<T extends LatLng>(start: LatLng, points: T[]): T[] {
  const totalLength = (list: T[]) =>
    list.reduce((sum, point, index) => sum + haversineMeters(index === 0 ? start : list[index - 1], point), 0);

  let best = [...points];
  let bestLength = totalLength(best);
  let improved = true;
  let guard = 0;

  while (improved && guard < 40) {
    improved = false;
    guard += 1;
    for (let i = 0; i < best.length - 1; i += 1) {
      for (let j = i + 1; j < best.length; j += 1) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ];
        const length = totalLength(candidate);
        if (length < bestLength - 1) {
          best = candidate;
          bestLength = length;
          improved = true;
        }
      }
    }
  }
  return best;
}

/** 실좌표를 0~100 캔버스 좌표로 투영 — 지도 SDK 없이도 같은 경로를 그릴 수 있게 한다 */
function projectToCanvas(points: LatLng[]): Array<{ x: number; y: number }> {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 1e-6;
  const spanLng = maxLng - minLng || 1e-6;

  return points.map((p) => ({
    x: Number((8 + ((p.lng - minLng) / spanLng) * 84).toFixed(2)),
    y: Number((92 - ((p.lat - minLat) / spanLat) * 84).toFixed(2)), // 위도는 위쪽이 커서 뒤집는다
  }));
}

/**
 * 카카오 실데이터로 루트를 만든다. 키가 없거나 검색 결과가 부족하면 시뮬레이션 루트로 폴백.
 */
export async function resolveRoute(area: RecommendedArea): Promise<SimulatedRoute> {
  if (!isKakaoLocalEnabled()) return buildSimulatedRoute(area);

  const center = await findCenter(area);
  if (!center) return buildSimulatedRoute(area);

  const byCategory = await Promise.all(
    (['SAFETY', 'EDUCATION', 'LIVING'] as LayerCategory[]).map(async (category) => ({
      category,
      places: await findPlaces(category, center),
    }))
  );

  const collected = byCategory.flatMap(({ category, places }) =>
    places.map((place) => ({
      category,
      place,
      lat: Number(place.y),
      lng: Number(place.x),
    }))
  );

  // 레이어마다 최소 2곳은 나와야 리포트가 의미 있다 — 부족하면 시뮬레이션으로 폴백
  const enough = byCategory.every(({ places }) => places.length >= 2);
  if (!enough || collected.length < 6) return buildSimulatedRoute(area);

  const ordered = twoOpt(center, orderByNearestNeighbour(center, collected));
  const canvas = projectToCanvas(ordered);

  const waypoints: Waypoint[] = ordered.map((item, index) => {
    const id = `${area.recommendedRouteId}-kakao-${item.place.id}`;
    return {
      id,
      order: index + 1,
      name: item.place.place_name,
      category: item.category,
      x: canvas[index].x,
      y: canvas[index].y,
      lat: item.lat,
      lng: item.lng,
      checkItems: CHECK_TEMPLATES[item.category].map((template, itemIndex) => ({
        ...template,
        id: `${id}-c${itemIndex + 1}`,
      })),
      isCompleted: false,
    };
  });

  const walk = await resolveWalkPath(
    waypoints.map((w) => ({ lat: w.lat!, lng: w.lng!, name: w.name }))
  );
  const walkMinutes = walk.legs.some((leg) => leg.durationSeconds)
    ? Math.ceil(walk.legs.reduce((sum, leg) => sum + (leg.durationSeconds ?? 0), 0) / 60)
    : estimateWalkMinutes(walk.totalDistanceMeters);

  return {
    routeId: area.recommendedRouteId,
    areaId: area.id,
    waypoints,
    source: 'KAKAO',
    walkProvider: walk.provider,
    hasSlopeData: false, // 카카오 Local API에는 고도/경사 정보가 없다
    center,
    pathLegs: walk.legs.map((leg) => leg.path),
    segmentDistances: walk.legs.map((leg) => leg.distanceMeters),
    segmentSlopeFactors: walk.legs.map(() => 1),
    totalDistanceMeters: walk.totalDistanceMeters,
    walkMinutes,
    totalMinutes: estimateTotalMinutes(walkMinutes, waypoints.length),
  };
}
