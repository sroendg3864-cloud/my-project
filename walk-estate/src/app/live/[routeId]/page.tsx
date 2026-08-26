import { notFound } from 'next/navigation';
import LiveWalkClient from './LiveWalkClient';
import { SIMULATED_AREAS, findAreaByRouteId } from '@/data/simulatedRoutes';
import { resolveRoute } from '@/lib/kakao/resolveRoute';

// POI/경로는 자주 바뀌지 않으므로 하루 단위로만 다시 만든다
export const revalidate = 86400;

export function generateStaticParams() {
  return SIMULATED_AREAS.map((area) => ({ routeId: area.recommendedRouteId }));
}

export default async function LiveWalkPage({
  params,
}: {
  params: Promise<{ routeId: string }>;
}) {
  const { routeId } = await params;
  const area = findAreaByRouteId(routeId);
  if (!area) notFound();

  return <LiveWalkClient area={area} route={await resolveRoute(area)} />;
}
