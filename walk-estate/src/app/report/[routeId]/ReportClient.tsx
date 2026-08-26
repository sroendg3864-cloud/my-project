'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Copy, FileDown, Footprints, MapPin } from 'lucide-react';
import RatingDisplayCard from '@/components/report/RatingDisplayCard';
import RouteMap from '@/components/map/RouteMap';
import { LAYER_META } from '@/lib/layerTheme';
import { useIsHydrated, useWalkSession } from '@/lib/walkSession';
import { calculateLayerScores, calculateOverallRating } from '@/utils/scoring';
import { CheckItem, RecommendedArea, SimulatedRoute } from '@/types';

interface Props {
  area: RecommendedArea;
  route: SimulatedRoute;
}

const answerText = (item: CheckItem): string => {
  if (item.type === 'BOOLEAN') {
    if (typeof item.value !== 'boolean') return '미응답';
    return item.value ? '예' : '아니오';
  }
  if (item.type === 'RATING') {
    return typeof item.value === 'number' ? `${item.value}/5점` : '미응답';
  }
  return typeof item.value === 'string' && item.value.trim() ? item.value : '메모 없음';
};

export default function ReportClient({ area, route }: Props) {
  const [copied, setCopied] = useState(false);
  const session = useWalkSession(route.routeId);
  const hydrated = useIsHydrated();

  const waypoints = useMemo(() => session?.waypoints ?? [], [session]);
  const overallScore = useMemo(() => calculateOverallRating(waypoints), [waypoints]);
  const layerScores = useMemo(() => calculateLayerScores(waypoints), [waypoints]);

  const markdown = useMemo(() => {
    if (!session) return '';
    const lines = [
      `# ${area.regionName} 임장 리포트`,
      '',
      `- 위치: ${area.regionName} · ${area.stationName}`,
      `- 종합 거주 평점: ${overallScore.toFixed(1)} / 5.0`,
      `- 안전 ${layerScores.SAFETY.toFixed(1)} · 교육 ${layerScores.EDUCATION.toFixed(1)} · 주거 ${layerScores.LIVING.toFixed(1)}`,
      `- 이동 ${(session.totalDistanceMeters / 1000).toFixed(1)}km · 도보 ${session.walkMinutes}분 · 총 ${session.totalMinutes}분`,
      '',
      '## 체크포인트',
      '',
    ];
    session.waypoints.forEach((waypoint) => {
      lines.push(`### ${waypoint.order}. ${waypoint.name} (${LAYER_META[waypoint.category].label})`);
      waypoint.checkItems.forEach((item) => {
        lines.push(`- ${item.question} → ${answerText(item)}`);
      });
      lines.push('');
    });
    return lines.join('\n');
  }, [area, layerScores, overallScore, session]);

  if (hydrated && !session) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="type-display-lg text-ink">아직 임장 기록이 없습니다</p>
        <p className="type-body-md text-muted">
          {area.regionName} 루트를 걸으며 체크포인트에 응답하면 리포트가 만들어집니다.
        </p>
        <Link
          href={`/live/${route.routeId}`}
          className="mt-2 flex h-12 items-center rounded-sm bg-primary px-6 type-title-sm text-on-primary hover:bg-primary-active"
        >
          임장 시작하기
        </Link>
        <Link href="/" className="type-body-sm text-muted underline">
          홈으로 돌아가기
        </Link>
      </main>
    );
  }

  if (!session) {
    return <main className="min-h-dvh bg-canvas" />;
  }

  const completedCount = session.waypoints.filter((waypoint) => waypoint.isCompleted).length;

  return (
    <main className="min-h-dvh bg-canvas pb-16">
      <header className="sticky top-0 z-20 border-b border-hairline-soft bg-white/90 backdrop-blur no-print">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
          <Link
            href="/"
            aria-label="홈으로"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-strong text-ink"
          >
            <ArrowLeft size={18} strokeWidth={2.2} />
          </Link>
          <p className="type-caption text-ink">임장 리포트</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 pt-6">
        <RatingDisplayCard
          overallScore={overallScore}
          layerScores={layerScores}
          address={`${area.regionName} · ${area.stationName}`}
        />

        <section className="mt-4 grid grid-cols-3 divide-x divide-hairline-soft rounded-md border border-hairline-soft bg-canvas">
          <Stat
            icon={<Footprints size={15} strokeWidth={2} />}
            label="이동 거리"
            value={`${(session.totalDistanceMeters / 1000).toFixed(1)}km`}
          />
          <Stat
            icon={<Clock size={15} strokeWidth={2} />}
            label="총 소요"
            value={`${session.totalMinutes}분`}
          />
          <Stat
            icon={<MapPin size={15} strokeWidth={2} />}
            label="완료 지점"
            value={`${completedCount}/${session.waypoints.length}`}
          />
        </section>

        <RouteMap
          route={route}
          waypoints={session.waypoints}
          activeIndex={session.waypoints.length - 1}
          showLabels
          className="mt-4 h-52 w-full rounded-md border border-hairline-soft"
        />

        {/* --- 현장 사진 / 메모 타임라인 --- */}
        <h2 className="type-title-md text-ink mt-10">현장 기록 타임라인</h2>
        <ol className="mt-4 border-l border-hairline-soft pl-5">
          {session.waypoints.map((waypoint) => {
            const meta = LAYER_META[waypoint.category];
            const photo = session.photos[waypoint.id];
            return (
              <li key={waypoint.id} className="relative pb-8">
                <span
                  className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-canvas"
                  style={{ backgroundColor: meta.color }}
                  aria-hidden
                />
                <div className="flex items-center gap-2">
                  <p className="type-title-sm text-ink">
                    {waypoint.order}. {waypoint.name}
                  </p>
                  <span
                    className="type-badge rounded-full px-2 py-0.5"
                    style={{ color: meta.color, backgroundColor: meta.softBg }}
                  >
                    {meta.label}
                  </span>
                </div>

                {photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo}
                    alt={`${waypoint.name} 현장 사진`}
                    className="mt-3 h-40 w-full rounded-md object-cover sm:w-72"
                  />
                )}

                <ul className="mt-3 space-y-2">
                  {waypoint.checkItems.map((item) => (
                    <li key={item.id} className="type-body-sm">
                      <span className="text-muted">{item.question}</span>
                      <span
                        className={`ml-2 ${
                          item.type === 'TEXT' ? 'text-body' : 'text-ink'
                        }`}
                      >
                        {answerText(item)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>

        {/* --- 내보내기 --- */}
        <div className="no-print mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex h-12 items-center gap-2 rounded-sm bg-primary px-5 type-title-sm text-on-primary transition-colors hover:bg-primary-active"
          >
            <FileDown size={17} strokeWidth={2.2} />
            PDF로 내보내기
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(markdown);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                setCopied(false);
              }
            }}
            className="flex h-12 items-center gap-2 rounded-sm border border-hairline bg-canvas px-5 type-title-sm text-ink transition-colors hover:bg-surface-soft"
          >
            <Copy size={17} strokeWidth={2.2} />
            {copied ? 'Notion용 마크다운 복사됨' : 'Notion으로 내보내기'}
          </button>
        </div>
      </div>
    </main>
  );
}

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
