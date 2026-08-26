'use client';

import React from 'react';
import KakaoRouteMap from './KakaoRouteMap';
import RouteCanvas from './RouteCanvas';
import SimulatedRouteCanvas from './SimulatedRouteCanvas';
import { isKakaoMapEnabled } from '@/lib/kakao/config';
import { Basemap } from '@/data/basemap';
import { SimulatedRoute, Waypoint } from '@/types';

interface Props {
  route: SimulatedRoute;
  basemap: Basemap | null;
  waypoints: Waypoint[];
  activeIndex?: number;
  showCurrentPosition?: boolean;
  showLabels?: boolean;
  align?: 'center' | 'top';
  onWaypointClick?: (waypoint: Waypoint) => void;
  className?: string;
}

/**
 * 지도 렌더러 선택기 — 실제 지도를 최우선으로 고른다.
 *
 *   1. 카카오 JS 키가 있으면 카카오맵 타일
 *   2. 없으면 OpenStreetMap 도로망을 그린 벡터 지도 (키 불필요)
 *   3. 좌표가 없는 시뮬레이션 루트면 도식 캔버스
 */
export const RouteMap: React.FC<Props> = ({ route, basemap, waypoints, showLabels, align, ...rest }) => {
  const hasCoords = waypoints.length > 0 && waypoints.every((w) => w.lat !== undefined && w.lng !== undefined);

  const fallback = basemap && hasCoords ? (
    <RouteCanvas
      basemap={basemap}
      route={route}
      waypoints={waypoints}
      activeIndex={rest.activeIndex}
      showCurrentPosition={rest.showCurrentPosition}
      showLabels={showLabels}
      align={align}
      onWaypointClick={rest.onWaypointClick}
      className={rest.className}
    />
  ) : (
    <SimulatedRouteCanvas
      waypoints={waypoints}
      activeIndex={rest.activeIndex}
      showCurrentPosition={rest.showCurrentPosition}
      showLabels={showLabels}
      align={align}
      onWaypointClick={rest.onWaypointClick}
      className={rest.className}
    />
  );

  if (!isKakaoMapEnabled() || !hasCoords) return fallback;
  return <KakaoRouteMap route={route} waypoints={waypoints} {...rest} fallback={fallback} />;
};

export default RouteMap;
