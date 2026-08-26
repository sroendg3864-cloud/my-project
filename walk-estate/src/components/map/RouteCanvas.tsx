'use client';

import React, { useMemo } from 'react';
import { Basemap, projectToMetres } from '@/data/basemap';
import { LAYER_META } from '@/lib/layerTheme';
import { SimulatedRoute, Waypoint } from '@/types';

interface Props {
  basemap: Basemap;
  route: SimulatedRoute;
  waypoints: Waypoint[];
  activeIndex?: number;
  showCurrentPosition?: boolean;
  showLabels?: boolean;
  /** 컨테이너가 세로로 길 때(현장 모드) 지도를 위쪽에 붙여 시트에 가리지 않게 한다 */
  align?: 'center' | 'top';
  onWaypointClick?: (waypoint: Waypoint) => void;
  className?: string;
}

/* ------------------------------------------------------------------ *
 * 실제 도로 폭(m)에 맞춘 선 굵기 — 좌표계 단위가 미터라 그대로 쓴다.
 * ------------------------------------------------------------------ */
const ROADS: Record<string, { casing: number; fill: number; color: string }> = {
  motorway:    { casing: 26, fill: 20, color: '#ffffff' },
  trunk:       { casing: 24, fill: 18, color: '#ffffff' },
  primary:     { casing: 20, fill: 15, color: '#ffffff' },
  secondary:   { casing: 17, fill: 12.5, color: '#ffffff' },
  tertiary:    { casing: 14, fill: 10, color: '#ffffff' },
  residential: { casing: 10, fill: 7, color: '#ffffff' },
  service:     { casing: 6, fill: 4, color: '#ffffff' },
  pedestrian:  { casing: 7, fill: 5, color: '#faf7f3' },
};
const ROAD_ORDER = ['service', 'pedestrian', 'residential', 'tertiary', 'secondary', 'primary', 'trunk', 'motorway'];
const AREA_CLASSES = new Set(['water', 'park', 'green']);

const toPath = (points: number[], closed: boolean): string => {
  let d = `M${points[0]} ${points[1]}`;
  for (let i = 2; i < points.length; i += 2) d += `L${points[i]} ${points[i + 1]}`;
  return closed ? `${d}Z` : d;
};

interface Layers { fill: Record<string, string>; stroke: Record<string, string> }

function buildLayers(basemap: Basemap): Layers {
  const fill: Record<string, string[]> = {};
  const stroke: Record<string, string[]> = {};

  basemap.features.forEach((feature) => {
    const name = basemap.classes[feature.c];
    if (!name) return;
    const target = feature.a === 1 && AREA_CLASSES.has(name) ? fill : stroke;
    (target[name] ??= []).push(toPath(feature.p, feature.a === 1));
  });

  const join = (source: Record<string, string[]>) =>
    Object.fromEntries(Object.entries(source).map(([key, list]) => [key, list.join('')]));
  return { fill: join(fill), stroke: join(stroke) };
}

/**
 * OpenStreetMap에서 받아 온 실제 도로망 위에 도보 임장 경로를 그린다.
 * 좌표계는 basemap의 미터 평면이라 축척이 맞고, 지도 SDK나 타일 요청이 필요 없다.
 */
export const RouteCanvas: React.FC<Props> = ({
  basemap, route, waypoints, activeIndex = 0, showCurrentPosition = false,
  showLabels = false, align = 'center', onWaypointClick, className = '',
}) => {
  const layers = useMemo(() => buildLayers(basemap), [basemap]);

  const points = useMemo(
    () =>
      [...waypoints]
        .sort((a, b) => a.order - b.order)
        .map((waypoint) => ({
          waypoint,
          ...(waypoint.lat !== undefined && waypoint.lng !== undefined
            ? projectToMetres(basemap, waypoint.lat, waypoint.lng)
            : { x: (waypoint.x / 100) * basemap.width, y: (waypoint.y / 100) * basemap.height }),
        })),
    [basemap, waypoints]
  );

  // 경로가 화면을 꽉 채우도록 경로 범위 + 여백으로 잘라 본다
  const view = useMemo(() => {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const pad = 150;
    const minX = Math.max(0, Math.min(...xs) - pad);
    const minY = Math.max(0, Math.min(...ys) - pad);
    const maxX = Math.min(basemap.width, Math.max(...xs) + pad);
    const maxY = Math.min(basemap.height, Math.max(...ys) + pad);
    return { minX, minY, width: Math.max(320, maxX - minX), height: Math.max(320, maxY - minY) };
  }, [basemap.height, basemap.width, points]);

  // 마커·글자는 화면 비율에 맞춰 키운다 (뷰가 좁을수록 작게)
  const unit = Math.max(view.width, view.height);
  const markerR = unit * 0.032;
  const numberSize = markerR * 1.15;
  const labelSize = unit * 0.026;

  const legPaths = route.pathLegs?.length
    ? route.pathLegs.map((leg) =>
        leg.map((point) => projectToMetres(basemap, point.lat, point.lng)))
    : points.slice(0, -1).map((point, index) => [point, points[index + 1]]);

  const road = (name: string, which: 'casing' | 'fill') => {
    const d = layers.stroke[name];
    if (!d) return null;
    const spec = ROADS[name];
    return (
      <path
        key={`${name}-${which}`}
        d={d}
        fill="none"
        stroke={which === 'casing' ? '#d8d4cb' : spec.color}
        strokeWidth={which === 'casing' ? spec.casing : spec.fill}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };

  return (
    <div className={`relative overflow-hidden bg-[#eae7e0] ${className}`}>
      <svg
        viewBox={`${view.minX} ${view.minY} ${view.width} ${view.height}`}
        preserveAspectRatio={align === 'top' ? 'xMidYMin meet' : 'xMidYMid meet'}
        className="h-full w-full"
        role="img"
        aria-label={`${basemap.regionName} 도보 임장 경로 지도`}
      >
        <rect x={-5000} y={-5000} width={20000} height={20000} fill="#eae7e0" />

        {/* 녹지 · 수계 */}
        {layers.fill.green && <path d={layers.fill.green} fill="#dfe9d5" />}
        {layers.fill.park && <path d={layers.fill.park} fill="#d6e4c8" />}
        {layers.fill.water && <path d={layers.fill.water} fill="#c9dfec" />}
        {layers.stroke.water && (
          <path d={layers.stroke.water} fill="none" stroke="#c9dfec" strokeWidth={9} strokeLinecap="round" />
        )}

        {/* 철도 */}
        {layers.stroke.rail && (
          <>
            <path d={layers.stroke.rail} fill="none" stroke="#c8c6c0" strokeWidth={7} strokeLinecap="round" />
            <path d={layers.stroke.rail} fill="none" stroke="#ffffff" strokeWidth={3} strokeDasharray="12 12" />
          </>
        )}
        {layers.stroke.subway && (
          <path d={layers.stroke.subway} fill="none" stroke="#ccd6e8" strokeWidth={5} strokeDasharray="16 10" />
        )}

        {/* 도로 — 테두리 먼저, 그 위에 노면 */}
        {ROAD_ORDER.map((name) => road(name, 'casing'))}
        {ROAD_ORDER.map((name) => road(name, 'fill'))}

        {/* 보행로 · 계단 */}
        {layers.stroke.footway && (
          <path d={layers.stroke.footway} fill="none" stroke="#cfcabf" strokeWidth={2.6} strokeDasharray="9 7" strokeLinecap="round" />
        )}
        {layers.stroke.steps && (
          <path d={layers.stroke.steps} fill="none" stroke="#c2bbaf" strokeWidth={4} strokeDasharray="3 3" />
        )}

        {/* 도보 임장 경로 */}
        {legPaths.map((leg, index) => (
          <polyline
            key={`leg-${index}`}
            points={leg.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={index < activeIndex ? '#ff385c' : '#ffb3c1'}
            strokeWidth={index < activeIndex ? unit * 0.011 : unit * 0.009}
            strokeDasharray={index < activeIndex ? undefined : `${unit * 0.018} ${unit * 0.014}`}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* 체크포인트 */}
        {points.map(({ waypoint, x, y }, index) => {
          const meta = LAYER_META[waypoint.category];
          const isActive = index === activeIndex;
          return (
            <g
              key={waypoint.id}
              onClick={onWaypointClick ? () => onWaypointClick(waypoint) : undefined}
              className={onWaypointClick ? 'cursor-pointer' : undefined}
            >
              {showLabels && (
                <text
                  x={x}
                  y={y - markerR - labelSize * 0.5}
                  textAnchor="middle"
                  fontSize={labelSize}
                  fontWeight="700"
                  fill="#3f3f3f"
                  stroke="#ffffff"
                  strokeWidth={labelSize * 0.28}
                  paintOrder="stroke"
                >
                  {waypoint.name.length > 11 ? `${waypoint.name.slice(0, 11)}…` : waypoint.name}
                </text>
              )}
              <circle
                cx={x}
                cy={y}
                r={isActive ? markerR * 1.2 : markerR}
                fill={waypoint.isCompleted ? meta.color : '#ffffff'}
                stroke={meta.color}
                strokeWidth={markerR * 0.34}
              />
              <text
                x={x}
                y={y + numberSize * 0.35}
                textAnchor="middle"
                fontSize={numberSize}
                fontWeight="700"
                fill={waypoint.isCompleted ? '#ffffff' : meta.color}
              >
                {waypoint.order}
              </text>
            </g>
          );
        })}

        {/* 현재 위치 */}
        {showCurrentPosition && points[Math.min(activeIndex, points.length - 1)] && (
          <g
            style={{
              transform: `translate(${points[Math.min(activeIndex, points.length - 1)].x}px, ${points[Math.min(activeIndex, points.length - 1)].y}px)`,
              transition: 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <circle r={markerR * 0.9} fill="#ff385c" opacity="0.45" className="we-pulse" />
            <circle r={markerR * 0.55} fill="#ff385c" stroke="#ffffff" strokeWidth={markerR * 0.25} />
          </g>
        )}
      </svg>

      <span className="pointer-events-none absolute bottom-1 right-1.5 rounded bg-white/70 px-1.5 py-0.5 text-[9px] leading-none text-muted-soft">
        {basemap.attribution}
      </span>
    </div>
  );
};

export default RouteCanvas;
