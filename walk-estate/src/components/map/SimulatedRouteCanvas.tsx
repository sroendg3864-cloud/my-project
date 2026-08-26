'use client';

import React, { useMemo } from 'react';
import { LAYER_META } from '@/lib/layerTheme';
import { Waypoint } from '@/types';

interface Props {
  waypoints: Waypoint[];
  /** 현재 향하고 있는(또는 체크 중인) waypoint 인덱스 */
  activeIndex?: number;
  showCurrentPosition?: boolean;
  showLabels?: boolean;
  /** 컨테이너가 세로로 길 때 경로를 중앙에 둘지, 위쪽에 붙일지 */
  align?: 'center' | 'top';
  onWaypointClick?: (waypoint: Waypoint) => void;
  className?: string;
}

/**
 * 가상 좌표(0~100) 기반 도보 경로 시뮬레이터.
 * 실제 지도 SDK(카카오맵 등)로 교체할 때는 waypoint.x/y를 lat/lng로 바꾸고
 * 이 컴포넌트만 지도 컴포넌트로 갈아끼우면 되도록 인터페이스를 맞춰두었다.
 */
export const SimulatedRouteCanvas: React.FC<Props> = ({
  waypoints,
  activeIndex = 0,
  showCurrentPosition = false,
  showLabels = false,
  align = 'center',
  onWaypointClick,
  className = '',
}) => {
  const points = useMemo(
    () => [...waypoints].sort((a, b) => a.order - b.order),
    [waypoints]
  );

  const fullPath = points.map((p) => `${p.x},${p.y}`).join(' ');
  const travelledPath = points
    .slice(0, Math.min(activeIndex + 1, points.length))
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  const current = points[Math.min(activeIndex, points.length - 1)];

  return (
    <div className={`relative overflow-hidden bg-surface-soft ${className}`}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio={align === 'top' ? 'xMidYMin meet' : 'xMidYMid meet'}
        className="h-full w-full"
        role="img"
        aria-label="도보 임장 경로 시뮬레이션"
      >
        {/* --- 배경: 블록/도로를 흉내낸 그리드 --- */}
        <defs>
          <pattern id="we-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill="#f7f7f7" />
            <path d="M10 0 L0 0 0 10" fill="none" stroke="#ebebeb" strokeWidth="0.5" />
          </pattern>
        </defs>
        {/* viewBox 밖까지 채워 어떤 비율의 컨테이너에서도 배경이 잘리지 않게 한다 */}
        <rect x="-300" y="-300" width="700" height="700" fill="url(#we-grid)" />
        <g stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" opacity="0.95">
          <line x1="-300" y1="30" x2="400" y2="30" />
          <line x1="-300" y1="72" x2="400" y2="72" />
          <line x1="24" y1="-300" x2="24" y2="400" />
          <line x1="70" y1="-300" x2="70" y2="400" />
        </g>
        <g fill="#eef1f0" opacity="0.9">
          <rect x="30" y="36" width="14" height="10" rx="1.5" />
          <rect x="52" y="40" width="12" height="12" rx="1.5" />
          <rect x="78" y="52" width="14" height="12" rx="1.5" />
          <rect x="8" y="52" width="12" height="14" rx="1.5" />
        </g>

        {/* --- 경로: 남은 구간(연한 점선) → 지나온 구간(Rausch 실선) --- */}
        <polyline
          points={fullPath}
          fill="none"
          stroke="#ffd1da"
          strokeWidth="1.8"
          strokeDasharray="3 2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.length > 1 && (
          <polyline
            points={travelledPath}
            fill="none"
            stroke="#ff385c"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* --- 카테고리별 마커 --- */}
        {points.map((waypoint, index) => {
          const meta = LAYER_META[waypoint.category];
          const isActive = index === activeIndex;
          return (
            <g
              key={waypoint.id}
              onClick={onWaypointClick ? () => onWaypointClick(waypoint) : undefined}
              className={onWaypointClick ? 'cursor-pointer' : undefined}
            >
              <circle
                cx={waypoint.x}
                cy={waypoint.y}
                r={isActive ? 3.6 : 3}
                fill={waypoint.isCompleted ? meta.color : '#ffffff'}
                stroke={meta.color}
                strokeWidth="1.4"
              />
              <text
                x={waypoint.x}
                y={waypoint.y + 1.1}
                textAnchor="middle"
                fontSize="3"
                fontWeight="700"
                fill={waypoint.isCompleted ? '#ffffff' : meta.color}
              >
                {waypoint.order}
              </text>
              {/* 라벨이 서로 겹치지 않도록 순서에 따라 위/아래로 번갈아 배치 */}
              {showLabels && (
                <text
                  x={waypoint.x}
                  y={waypoint.order % 2 === 0 ? waypoint.y - 4.8 : waypoint.y + 7}
                  textAnchor="middle"
                  fontSize="2.5"
                  fontWeight="600"
                  fill="#3f3f3f"
                >
                  {shortLabel(waypoint.name)}
                </text>
              )}
            </g>
          );
        })}

        {/* --- 현재 위치 핀 --- */}
        {showCurrentPosition && current && (
          <g
            style={{
              transform: `translate(${current.x}px, ${current.y}px)`,
              transition: 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <circle r="3.2" fill="#ff385c" opacity="0.45" className="we-pulse" />
            <circle r="2" fill="#ff385c" stroke="#ffffff" strokeWidth="1" />
          </g>
        )}
      </svg>
    </div>
  );
};

/** 지도 라벨은 좁으므로 지역명 접두어를 떼고 10자로 줄여 표기한다 */
function shortLabel(name: string): string {
  const spaceIndex = name.indexOf(' ');
  const trimmed = spaceIndex > 0 ? name.slice(spaceIndex + 1) : name;
  return trimmed.length > 10 ? `${trimmed.slice(0, 10)}…` : trimmed;
}

export default SimulatedRouteCanvas;
