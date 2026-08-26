import { notFound } from 'next/navigation';
import LiveWalkClient from './LiveWalkClient';
import { SIMULATED_AREAS, findAreaByRouteId } from '@/data/simulatedRoutes';
import { buildSimulatedRoute } from '@/utils/scoring';

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

  return <LiveWalkClient area={area} route={buildSimulatedRoute(area)} />;
}
