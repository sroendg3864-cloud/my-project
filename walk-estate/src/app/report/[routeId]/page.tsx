import { notFound } from 'next/navigation';
import ReportClient from './ReportClient';
import { SIMULATED_AREAS, findAreaByRouteId } from '@/data/simulatedRoutes';
import { buildSimulatedRoute } from '@/utils/scoring';

export function generateStaticParams() {
  return SIMULATED_AREAS.map((area) => ({ routeId: area.recommendedRouteId }));
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ routeId: string }>;
}) {
  const { routeId } = await params;
  const area = findAreaByRouteId(routeId);
  if (!area) notFound();

  return <ReportClient area={area} route={buildSimulatedRoute(area)} />;
}
