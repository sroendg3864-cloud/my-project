'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Footprints, X } from 'lucide-react';
import CheckpointCard, { isCheckItemAnswered } from '@/components/live/CheckpointCard';
import LiveBottomHUD from '@/components/live/LiveBottomHUD';
import RouteMap from '@/components/map/RouteMap';
import { LAYER_META } from '@/lib/layerTheme';
import { compressImageFile, saveWalkSession, useWalkSession } from '@/lib/walkSession';
import { RecommendedArea, SimulatedRoute, WalkSession } from '@/types';

interface Props {
  area: RecommendedArea;
  route: SimulatedRoute;
}

const createSession = (area: RecommendedArea, route: SimulatedRoute): WalkSession => ({
  routeId: route.routeId,
  areaId: area.id,
  startedAt: new Date().toISOString(),
  waypoints: route.waypoints,
  photos: {},
  totalDistanceMeters: route.totalDistanceMeters,
  walkMinutes: route.walkMinutes,
  totalMinutes: route.totalMinutes,
});

export default function LiveWalkClient({ area, route }: Props) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(true);
  const [hint, setHint] = useState('');

  // localStorage가 단일 진실 공급원 — 저장된 진행 상황이 있으면 그대로 이어서 진행한다.
  const stored = useWalkSession(route.routeId);
  const freshSession = useMemo(() => createSession(area, route), [area, route]);
  const session =
    stored && stored.waypoints.length === route.waypoints.length ? stored : freshSession;

  const activeIndex = useMemo(() => {
    const index = session.waypoints.findIndex((waypoint) => !waypoint.isCompleted);
    return index === -1 ? session.waypoints.length - 1 : index;
  }, [session.waypoints]);

  const activeWaypoint = session.waypoints[activeIndex];
  const completedCount = session.waypoints.filter((waypoint) => waypoint.isCompleted).length;
  const remainingMeters = Math.round(
    route.segmentDistances.slice(activeIndex).reduce((sum, distance) => sum + distance, 0)
  );

  const persist = useCallback((next: WalkSession) => {
    saveWalkSession(next);
  }, []);

  const handleAnswer = useCallback(
    (checkItemId: string, value: boolean | number | string) => {
      setHint('');
      persist({
        ...session,
        waypoints: session.waypoints.map((waypoint) =>
          waypoint.id !== activeWaypoint.id
            ? waypoint
            : {
                ...waypoint,
                checkItems: waypoint.checkItems.map((item) =>
                  item.id === checkItemId ? { ...item, value } : item
                ),
              }
        ),
      });
    },
    [activeWaypoint, persist, session]
  );

  const handleCapturePhoto = useCallback(
    async (file: File) => {
      try {
        const dataUrl = await compressImageFile(file);
        persist({ ...session, photos: { ...session.photos, [activeWaypoint.id]: dataUrl } });
      } catch {
        setHint('사진을 저장하지 못했습니다.');
      }
    },
    [activeWaypoint, persist, session]
  );

  const handleComplete = useCallback(() => {
    if (!sheetOpen) {
      setSheetOpen(true);
      return;
    }
    if (!activeWaypoint.checkItems.every(isCheckItemAnswered)) {
      setHint('아직 응답하지 않은 항목이 있어요.');
      return;
    }

    const waypoints = session.waypoints.map((waypoint) =>
      waypoint.id === activeWaypoint.id ? { ...waypoint, isCompleted: true } : waypoint
    );
    const isLast = waypoints.every((waypoint) => waypoint.isCompleted);
    const next: WalkSession = {
      ...session,
      waypoints,
      finishedAt: isLast ? new Date().toISOString() : undefined,
    };

    setHint('');
    persist(next);
    if (isLast) router.push(`/report/${route.routeId}`);
  }, [activeWaypoint, persist, route.routeId, router, session, sheetOpen]);

  const meta = LAYER_META[activeWaypoint.category];

  return (
    <main className="relative min-h-dvh bg-surface-soft">
      {/* --- 전체 화면 시뮬레이션 캔버스 --- */}
      <RouteMap
        route={route}
        waypoints={session.waypoints}
        activeIndex={activeIndex}
        showCurrentPosition
        align="top"
        className="fixed inset-x-0 bottom-0 top-16 w-full"
      />

      {/* --- 상단 반투명 헤더 --- */}
      <header className="fixed inset-x-0 top-0 z-30 border-b border-hairline-soft bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-5 py-3">
          <button
            type="button"
            onClick={() => router.push('/')}
            aria-label="임장 중단하고 나가기"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-strong text-ink"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="type-caption text-ink truncate">
              {area.regionName} · {area.stationName}
            </p>
            <p className="type-body-sm text-muted mt-0.5 flex items-center gap-1.5">
              <span style={{ color: meta.color }}>{meta.label}</span>
              <span className="text-hairline">|</span>
              <Footprints size={13} strokeWidth={2} />
              남은 거리 {remainingMeters}m
            </p>
          </div>
          <span className="type-caption shrink-0 rounded-full bg-primary-soft px-3 py-1 text-primary">
            {completedCount}/{session.waypoints.length}
          </span>
        </div>
      </header>

      {/* --- 체크포인트 바텀시트 --- */}
      <div className="fixed inset-x-0 bottom-[88px] z-30 px-4">
        <div className="mx-auto max-w-xl">
          <button
            type="button"
            onClick={() => setSheetOpen((open) => !open)}
            className="mx-auto mb-2 flex h-9 items-center gap-1.5 rounded-full border border-hairline-soft bg-white/90 px-4 type-body-sm text-body shadow-card-float backdrop-blur"
          >
            {sheetOpen ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            {sheetOpen ? '지도 더 보기' : `체크포인트 ${activeWaypoint.order} 열기`}
          </button>

          {hint && (
            <p className="mx-auto mb-2 w-fit rounded-full bg-ink/85 px-3 py-1.5 type-body-sm text-on-primary">
              {hint}
            </p>
          )}

          {sheetOpen && (
            <div key={activeWaypoint.id} className="we-slide-up">
              <CheckpointCard
                waypoint={activeWaypoint}
                onAnswer={handleAnswer}
                onComplete={handleComplete}
                photoDataUrl={session.photos[activeWaypoint.id]}
                onCapturePhoto={handleCapturePhoto}
              />
            </div>
          )}
        </div>
      </div>

      <LiveBottomHUD
        currentStep={Math.min(activeIndex + 1, session.waypoints.length)}
        totalSteps={session.waypoints.length}
        nextWaypointName={activeWaypoint.name}
        onCompleteStep={handleComplete}
      />
    </main>
  );
}
