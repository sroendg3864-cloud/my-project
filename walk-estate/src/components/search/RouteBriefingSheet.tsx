'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Footprints, Mountain, Route as RouteIcon, X } from 'lucide-react';
import RouteMap from '@/components/map/RouteMap';
import { LAYER_META, THEME_META } from '@/lib/layerTheme';
import { CHECKPOINT_AVG_MINUTES } from '@/utils/scoring';
import { RecommendedArea, SimulatedRoute } from '@/types';

interface Props {
  area: RecommendedArea;
  /** 먼저 보여줄 시뮬레이션 루트 — 카카오 실좌표 루트가 도착하면 교체된다 */
  initialRoute: SimulatedRoute;
  targetMinutes: number;
  onClose: () => void;
}

/** 3.2 루트 브리핑 & 맵 뷰 — 카드를 누르면 열리는 경로 브리핑 시트 */
export const RouteBriefingSheet: React.FC<Props> = ({ area, initialRoute, targetMinutes, onClose }) => {
  const router = useRouter();
  const theme = THEME_META[area.theme];
  const [route, setRoute] = useState(initialRoute);

  // 카카오 키가 설정되어 있으면 실제 장소로 만든 루트로 교체한다 (없으면 그대로 시뮬레이션)
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/routes/${initialRoute.routeId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: SimulatedRoute | null) => {
        if (!cancelled && data?.routeId) setRoute(data);
      })
      .catch(() => { /* 실패해도 시뮬레이션 루트로 계속 진행 */ });
    return () => { cancelled = true; };
  }, [initialRoute.routeId]);

  const diff = route.totalMinutes - targetMinutes;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        role="presentation"
      />

      <div className="we-slide-up relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-lg bg-canvas sm:rounded-lg">
        <header className="flex items-start justify-between gap-3 border-b border-hairline-soft px-5 py-4">
          <div>
            <span
              className="type-badge inline-flex rounded-full px-2.5 py-1"
              style={{ color: theme.color, backgroundColor: theme.softBg }}
            >
              {area.badgeLabel}
            </span>
            <h2 className="type-display-lg text-ink mt-2">
              {area.regionName} 도보 임장 루트
            </h2>
            <p className="type-body-sm text-muted mt-0.5">
              {area.stationName} 출발 · 체크포인트 {route.waypoints.length}곳
            </p>
            <p className="type-badge text-muted-soft mt-1.5">
              {route.source === 'KAKAO'
                ? `카카오맵 실제 장소 · ${route.walkProvider === 'tmap-pedestrian' ? '보행자 경로 실측' : '직선거리 ×1.25 근사'}`
                : '시뮬레이션 데이터 (카카오 키 미설정)'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-strong text-ink hover:bg-hairline-soft"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </header>

        <div className="overflow-y-auto">
          <RouteMap
            route={route}
            waypoints={route.waypoints}
            activeIndex={0}
            showLabels
            className="h-56 w-full border-b border-hairline-soft"
          />

          <div className="grid grid-cols-3 divide-x divide-hairline-soft border-b border-hairline-soft">
            <Stat
              icon={<RouteIcon size={15} strokeWidth={2} />}
              label="총 이동 거리"
              value={`${(route.totalDistanceMeters / 1000).toFixed(1)}km`}
            />
            <Stat
              icon={<Footprints size={15} strokeWidth={2} />}
              label="도보 시간"
              value={`${route.walkMinutes}분`}
            />
            <Stat
              icon={<Clock size={15} strokeWidth={2} />}
              label="이동 + 체크"
              value={`${route.totalMinutes}분`}
            />
          </div>

          <p className="type-body-sm text-muted px-5 pt-4">
            분당 80m 기준 이동 {route.walkMinutes}분 + 체크포인트 {route.waypoints.length}곳 ×{' '}
            {CHECKPOINT_AVG_MINUTES}분 ={' '}
            <span className="text-ink">{route.totalMinutes}분</span>
            {diff > 0 ? (
              <span className="text-primary"> · 목표 {targetMinutes}분보다 {diff}분 깁니다</span>
            ) : (
              <span className="text-living"> · 목표 {targetMinutes}분 안에 완주 가능</span>
            )}
          </p>

          <ol className="px-5 py-4">
            {route.waypoints.map((waypoint, index) => {
              const meta = LAYER_META[waypoint.category];
              const steep = route.hasSlopeData && route.segmentSlopeFactors[index] > 1;
              return (
                <li key={waypoint.id} className="flex gap-3 py-2.5">
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full type-badge text-on-primary"
                    style={{ backgroundColor: meta.color }}
                  >
                    {waypoint.order}
                  </span>
                  <div className="min-w-0">
                    <p className="type-body-sm text-ink truncate">{waypoint.name}</p>
                    <p className="type-body-sm text-muted-soft mt-0.5 flex items-center gap-2">
                      <span style={{ color: meta.color }}>{meta.label}</span>
                      {index < route.segmentDistances.length && (
                        <span>
                          다음 구간 {Math.round(route.segmentDistances[index])}m
                        </span>
                      )}
                      {steep && (
                        <span className="inline-flex items-center gap-0.5 text-primary">
                          <Mountain size={12} strokeWidth={2} />
                          급경사
                        </span>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <footer className="border-t border-hairline-soft bg-canvas px-5 py-4">
          <button
            type="button"
            onClick={() => router.push(`/live/${route.routeId}`)}
            className="h-12 w-full rounded-sm bg-primary type-title-sm text-on-primary transition-colors hover:bg-primary-active active:scale-[0.99]"
          >
            현장 임장 시작하기
          </button>
        </footer>
      </div>
    </div>
  );
};

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className="px-4 py-3.5 text-center">
    <p className="type-body-sm text-muted flex items-center justify-center gap-1">
      {icon}
      {label}
    </p>
    <p className="type-title-md text-ink mt-1">{value}</p>
  </div>
);

export default RouteBriefingSheet;
