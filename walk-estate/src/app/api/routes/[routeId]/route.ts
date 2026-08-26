import { findAreaByRouteId } from '@/data/simulatedRoutes';
import { resolveAreaRoute } from '@/lib/routes/resolve';

/**
 * GET /api/routes/route-c2 → { route, basemap }
 *
 * 실제 장소로 만든 루트와 그 지역의 OSM 지도 데이터를 함께 돌려준다.
 * 카카오 키가 없어도 OSM 실데이터로 채워지므로 클라이언트는 분기 없이 쓰면 된다.
 * REST 키는 이 핸들러(서버) 안에서만 쓰이고 응답에 포함되지 않는다.
 */
export async function GET(request: Request, { params }: { params: Promise<{ routeId: string }> }) {
  const { routeId } = await params;
  const area = findAreaByRouteId(routeId);
  if (!area) return Response.json({ error: '없는 루트입니다.' }, { status: 404 });

  const { route, basemap } = await resolveAreaRoute(area);
  return Response.json({ route, basemap }, {
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800' },
  });
}
