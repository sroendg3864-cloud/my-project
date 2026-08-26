import { findAreaByRouteId } from '@/data/simulatedRoutes';
import { resolveRoute } from '@/lib/kakao/resolveRoute';

/**
 * GET /api/routes/route-c2
 *
 * 카카오 실좌표 루트를 돌려준다. REST 키가 없거나 검색 결과가 부족하면
 * 시뮬레이션 루트가 그대로 나오므로 클라이언트는 분기 없이 쓰면 된다.
 * REST 키는 이 핸들러(서버) 안에서만 쓰이고 응답에 포함되지 않는다.
 */
export async function GET(request: Request, { params }: { params: Promise<{ routeId: string }> }) {
  const { routeId } = await params;
  const area = findAreaByRouteId(routeId);
  if (!area) return Response.json({ error: '없는 루트입니다.' }, { status: 404 });

  const route = await resolveRoute(area);
  return Response.json(route, {
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800' },
  });
}
