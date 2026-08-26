import { notFound } from 'next/navigation';
import ReportClient from './ReportClient';
import { SIMULATED_AREAS, findAreaByRouteId } from '@/data/simulatedRoutes';
import { resolveAreaRoute } from '@/lib/routes/resolve';

// POI/경로는 자주 바뀌지 않으므로 하루 단위로만 다시 만든다
export const revalidate = 86400;

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

  const { route, basemap } = await resolveAreaRoute(area);
  return <ReportClient area={area} route={route} basemap={basemap} />;
}
