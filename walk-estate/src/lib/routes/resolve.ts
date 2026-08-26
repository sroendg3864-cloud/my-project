/**
 * 지역 → 도보 임장 루트 + 실제 지도.
 *
 * 세 단계로 폴백한다.
 *   1. 카카오 REST 키가 있으면 카카오 장소 검색 (국내 POI 정확도가 가장 높다)
 *   2. 없으면 OpenStreetMap에서 미리 받아 둔 실제 POI — 키가 필요 없다
 *   3. 그것도 없으면 지역 이름 기반 시뮬레이션
 *
 * 지도는 어느 경우든 OSM 실측 데이터를 함께 돌려주므로, 키가 하나도 없어도
 * 실제 도로망 위에 경로가 그려진다.
 */
import 'server-only';
import { Basemap } from '@/data/basemap';
import { getBasemap } from '@/data/basemaps';
import { resolveKakaoRoute } from '@/lib/kakao/resolveRoute';
import { resolveOsmRoute } from '@/lib/osm/resolveRoute';
import { buildSimulatedRoute } from '@/utils/scoring';
import { RecommendedArea, SimulatedRoute } from '@/types';

export interface ResolvedRoute {
  route: SimulatedRoute;
  basemap: Basemap | null;
}

export async function resolveAreaRoute(area: RecommendedArea): Promise<ResolvedRoute> {
  const basemap = getBasemap(area.id);

  const kakao = await resolveKakaoRoute(area);
  if (kakao) return { route: kakao, basemap };

  if (basemap) {
    const osm = resolveOsmRoute(area, basemap);
    if (osm) return { route: osm, basemap };
  }

  return { route: buildSimulatedRoute(area), basemap };
}
