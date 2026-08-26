'use client';

import React, { useEffect, useRef, useState } from 'react';
import { KakaoMapInstance, KakaoMaps, KakaoOverlay, loadKakaoSdk } from '@/lib/kakao/sdk';
import { LAYER_META } from '@/lib/layerTheme';
import { SimulatedRoute, Waypoint } from '@/types';

interface Props {
  route: SimulatedRoute;
  waypoints: Waypoint[];
  activeIndex?: number;
  showCurrentPosition?: boolean;
  onWaypointClick?: (waypoint: Waypoint) => void;
  className?: string;
  /** SDK 로딩에 실패했을 때 대신 그릴 화면 (시뮬레이션 캔버스) */
  fallback: React.ReactNode;
}

const markerHtml = (waypoint: Waypoint, active: boolean) => {
  const meta = LAYER_META[waypoint.category];
  const size = active ? 34 : 28;
  return `<div style="width:${size}px;height:${size}px;border-radius:999px;display:flex;align-items:center;justify-content:center;
    font:700 ${active ? 14 : 12}px -apple-system,BlinkMacSystemFont,sans-serif;
    background:${waypoint.isCompleted ? meta.color : '#ffffff'};color:${waypoint.isCompleted ? '#ffffff' : meta.color};
    border:2px solid ${meta.color};box-shadow:0 2px 6px rgba(0,0,0,0.2);cursor:pointer">${waypoint.order}</div>`;
};

const hereHtml = `<div style="position:relative;width:18px;height:18px">
  <span style="position:absolute;inset:0;border-radius:999px;background:#ff385c;opacity:.4" class="we-pulse"></span>
  <span style="position:absolute;inset:4px;border-radius:999px;background:#ff385c;border:2px solid #fff"></span>
</div>`;

/** 카카오맵 위에 도보 임장 경로를 그린다. SimulatedRouteCanvas와 같은 인터페이스를 갖는다. */
export const KakaoRouteMap: React.FC<Props> = ({
  route, waypoints, activeIndex = 0, showCurrentPosition = false, onWaypointClick, className = '', fallback,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const mapsRef = useRef<KakaoMaps | null>(null);
  const overlaysRef = useRef<KakaoOverlay[]>([]);
  const [failed, setFailed] = useState(false);

  // 1) SDK 로드 + 지도 생성 (한 번만)
  useEffect(() => {
    let cancelled = false;
    loadKakaoSdk()
      .then((maps) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const first = waypoints[0];
        const center = route.center ?? { lat: first?.lat ?? 37.5665, lng: first?.lng ?? 126.978 };
        mapsRef.current = maps;
        mapRef.current = new maps.Map(containerRef.current, {
          center: new maps.LatLng(center.lat, center.lng),
          level: 5,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn('[kakao] 지도 초기화 실패 — 시뮬레이션 캔버스로 대체합니다.', error);
        setFailed(true);
      });
    return () => { cancelled = true; };
  }, [route.center, waypoints]);

  // 2) 마커·경로선 갱신
  useEffect(() => {
    const maps = mapsRef.current;
    const map = mapRef.current;
    if (!maps || !map) return;

    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];

    const legs = route.pathLegs?.length
      ? route.pathLegs
      : [waypoints.filter((w) => w.lat && w.lng).map((w) => ({ lat: w.lat!, lng: w.lng! }))];

    legs.forEach((leg, index) => {
      if (leg.length < 2) return;
      const walked = index < activeIndex;
      const line = new maps.Polyline({
        path: leg.map((point) => new maps.LatLng(point.lat, point.lng)),
        strokeWeight: walked ? 6 : 5,
        strokeColor: walked ? '#ff385c' : '#ffd1da',
        strokeOpacity: 0.95,
        strokeStyle: walked ? 'solid' : 'shortdash',
      });
      line.setMap(map);
      overlaysRef.current.push(line);
    });

    waypoints.forEach((waypoint, index) => {
      if (waypoint.lat === undefined || waypoint.lng === undefined) return;
      const position = new maps.LatLng(waypoint.lat, waypoint.lng);
      const element = document.createElement('div');
      element.innerHTML = markerHtml(waypoint, index === activeIndex);
      if (onWaypointClick) element.addEventListener('click', () => onWaypointClick(waypoint));

      const overlay = new maps.CustomOverlay({ position, content: element, yAnchor: 0.5, zIndex: index === activeIndex ? 5 : 3 });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });

    const active = waypoints[Math.min(activeIndex, waypoints.length - 1)];
    if (showCurrentPosition && active?.lat !== undefined && active?.lng !== undefined) {
      const here = new maps.CustomOverlay({
        position: new maps.LatLng(active.lat, active.lng),
        content: hereHtml, yAnchor: 0.5, zIndex: 6,
      });
      here.setMap(map);
      overlaysRef.current.push(here);
      map.panTo(new maps.LatLng(active.lat, active.lng));
    } else {
      const bounds = new maps.LatLngBounds();
      waypoints.forEach((w) => { if (w.lat !== undefined && w.lng !== undefined) bounds.extend(new maps.LatLng(w.lat, w.lng)); });
      map.setBounds(bounds, 40, 24, 40, 24);
    }
  }, [activeIndex, onWaypointClick, route.pathLegs, showCurrentPosition, waypoints]);

  if (failed) return <>{fallback}</>;
  return <div ref={containerRef} className={className} aria-label="카카오맵 도보 임장 경로" role="img" />;
};

export default KakaoRouteMap;
