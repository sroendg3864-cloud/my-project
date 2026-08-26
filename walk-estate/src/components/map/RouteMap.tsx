'use client';

import React from 'react';
import KakaoRouteMap from './KakaoRouteMap';
import SimulatedRouteCanvas from './SimulatedRouteCanvas';
import { isKakaoMapEnabled } from '@/lib/kakao/config';
import { SimulatedRoute, Waypoint } from '@/types';

interface Props {
  route: SimulatedRoute;
  waypoints: Waypoint[];
  activeIndex?: number;
  showCurrentPosition?: boolean;
  showLabels?: boolean;
  align?: 'center' | 'top';
  onWaypointClick?: (waypoint: Waypoint) => void;
  className?: string;
}

/**
 * 지도 렌더러 선택기.
 *
 * 카카오 JS 키가 있고 루트가 실좌표(KAKAO)라면 카카오맵을, 아니면 시뮬레이션 캔버스를 그린다.
 * 카카오맵 로딩이 실패해도 같은 자리에서 캔버스로 조용히 대체된다.
 */
export const RouteMap: React.FC<Props> = ({ route, waypoints, showLabels, align, ...rest }) => {
  const canvas = (
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

  const usesRealCoords = route.source === 'KAKAO' && waypoints.every((w) => w.lat !== undefined && w.lng !== undefined);
  if (!isKakaoMapEnabled() || !usesRealCoords) return canvas;

  return <KakaoRouteMap route={route} waypoints={waypoints} {...rest} fallback={canvas} />;
};

export default RouteMap;
