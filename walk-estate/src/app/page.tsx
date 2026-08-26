'use client';

import React, { useMemo, useState } from 'react';
import { Compass, Info, Wallet } from 'lucide-react';
import DiscoveryTownCard from '@/components/search/DiscoveryTownCard';
import RouteBriefingSheet from '@/components/search/RouteBriefingSheet';
import SearchBarPill, { SearchSegment } from '@/components/search/SearchBarPill';
import { SIMULATED_AREAS, findAreaById } from '@/data/simulatedRoutes';
import { THEME_META, THEME_ORDER } from '@/lib/layerTheme';
import { calculateMaxAffordablePrice, formatKrwManwon } from '@/utils/finance';
import { buildSimulatedRoute, calculateAreaScore, recommendAreas } from '@/utils/scoring';
import { RecommendedArea, UserFinancialProfile } from '@/types';

type Deal = 'BUY' | 'JEONSE';

const THEME_DESCRIPTION: Record<string, string> = {
  HOT_TRADING: '최근 3개월 거래 회전율이 높아 시세 확인이 쉬운 동네',
  POPULAR_RESIDENTIAL: '수요 밀도가 높고 실거주 만족도가 좋은 대단지 위주',
  BUDGET_PERFECT: '지금 예산에 가장 잘 맞아떨어지는 가성비 후보',
};

export default function HomePage() {
  const [profile, setProfile] = useState<UserFinancialProfile>({
    availableCash: 20000,
    annualIncome: 7000,
    existingLoanAnnualRepayment: 0,
    transactionType: 'BUY',
  });
  const [targetMinutes, setTargetMinutes] = useState(60);
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [openSegment, setOpenSegment] = useState<SearchSegment | null>(null);
  const [briefingAreaId, setBriefingAreaId] = useState<string | null>(null);

  const deal = profile.transactionType as Deal;
  const maxAffordable = useMemo(() => calculateMaxAffordablePrice(profile), [profile]);

  const pinnedArea = selectedRegionId ? findAreaById(selectedRegionId) : undefined;

  const groups = useMemo(
    () =>
      THEME_ORDER.map((theme) => ({
        theme,
        areas: recommendAreas(maxAffordable, deal, theme).filter(
          (area) => area.id !== selectedRegionId
        ),
      })),
    [maxAffordable, deal, selectedRegionId]
  );

  const briefingArea = briefingAreaId ? findAreaById(briefingAreaId) : undefined;
  const briefingRoute = briefingArea ? buildSimulatedRoute(briefingArea) : undefined;

  const scoreOf = (area: RecommendedArea) =>
    calculateAreaScore(area, maxAffordable, SIMULATED_AREAS, deal);

  return (
    <main className="min-h-dvh bg-canvas pb-20">
      {/* --- 헤더 --- */}
      <header className="border-b border-hairline-soft bg-canvas">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-5 py-4">
          <Compass size={22} strokeWidth={2.4} className="text-primary" />
          <span className="type-title-md text-ink">WalkEstate</span>
          <span className="type-body-sm text-muted">임장로드</span>
        </div>
      </header>

      {/* --- 스마트 탐색 --- */}
      <section className="border-b border-hairline-soft bg-canvas px-5 pb-8 pt-10">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="type-display-lg text-ink">
            예산에 맞는 동네를 찾고, 발로 확인하세요
          </h1>
          <p className="type-body-md text-muted mt-2">
            가용 자산·소득으로 실구매 상한가를 역산하고, 안전·교육·주거 환경을 걸으며 검증합니다.
          </p>
        </div>

        <div className="mx-auto mt-7 max-w-3xl">
          <SearchBarPill
            location={pinnedArea ? pinnedArea.regionName : ''}
            transactionType={deal === 'BUY' ? '매매' : '전세'}
            budgetText={`최대 ${formatKrwManwon(maxAffordable)}`}
            durationText={`${targetMinutes}분`}
            activeSegment={openSegment}
            onSegmentClick={(segment) =>
              setOpenSegment((current) => (current === segment ? null : segment))
            }
            onSearch={() => setOpenSegment((current) => (current ? null : 'budget'))}
          />

          {openSegment && (
            <div className="we-slide-up mt-3 rounded-md border border-hairline-soft bg-canvas p-5 shadow-card-float">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="지역">
                  <select
                    value={selectedRegionId}
                    onChange={(event) => setSelectedRegionId(event.target.value)}
                    className="h-11 w-full rounded-sm border border-hairline bg-surface-soft px-3 type-body-sm text-ink focus:border-muted-soft focus:outline-none"
                  >
                    <option value="">어디든 추천받기</option>
                    {SIMULATED_AREAS.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.regionName} ({area.stationName})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="거래 유형">
                  <div className="flex gap-2">
                    {(['BUY', 'JEONSE'] as Deal[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          setProfile((current) => ({ ...current, transactionType: option }))
                        }
                        className={`h-11 flex-1 rounded-sm border type-caption transition-colors ${
                          deal === option
                            ? 'border-primary bg-primary text-on-primary'
                            : 'border-hairline bg-surface-soft text-body hover:border-muted-soft'
                        }`}
                      >
                        {option === 'BUY' ? '매매' : '전세'}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="가용 현금 (만원)">
                  <NumberInput
                    value={profile.availableCash}
                    onChange={(value) =>
                      setProfile((current) => ({ ...current, availableCash: value }))
                    }
                  />
                </Field>

                <Field label="연 소득 (만원)">
                  <NumberInput
                    value={profile.annualIncome}
                    onChange={(value) =>
                      setProfile((current) => ({ ...current, annualIncome: value }))
                    }
                  />
                </Field>

                <Field label="기존 대출 연 상환액 (만원)">
                  <NumberInput
                    value={profile.existingLoanAnnualRepayment}
                    onChange={(value) =>
                      setProfile((current) => ({
                        ...current,
                        existingLoanAnnualRepayment: value,
                      }))
                    }
                  />
                </Field>

                <Field label={`목표 임장 시간 · ${targetMinutes}분`}>
                  <input
                    type="range"
                    min={30}
                    max={90}
                    step={10}
                    value={targetMinutes}
                    onChange={(event) => setTargetMinutes(Number(event.target.value))}
                    className="h-11 w-full accent-[#ff385c]"
                  />
                </Field>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 rounded-sm bg-surface-soft px-4 py-3">
                <Wallet size={16} strokeWidth={2} className="text-primary" />
                <span className="type-caption text-ink">
                  {deal === 'BUY' ? '매매' : '전세'} 상한가 {formatKrwManwon(maxAffordable)}
                </span>
                <span className="type-body-sm text-muted">
                  {deal === 'BUY'
                    ? '(가용현금 + min(LTV 상한, DSR 40% 한도)) × 0.965'
                    : '가용현금 + min(보증금 80%, 연소득 × 4.0)'}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* --- 추천 결과 --- */}
      <div className="mx-auto max-w-5xl px-5">
        {pinnedArea && (
          <Group
            title="선택한 지역"
            description="직접 고른 동네의 도보 임장 루트입니다."
            areas={[pinnedArea]}
            deal={deal}
            scoreOf={scoreOf}
            onSelect={setBriefingAreaId}
          />
        )}

        {groups.map(({ theme, areas }) => (
          <Group
            key={theme}
            title={THEME_META[theme].label}
            description={THEME_DESCRIPTION[theme]}
            areas={areas}
            deal={deal}
            scoreOf={scoreOf}
            onSelect={setBriefingAreaId}
          />
        ))}

        <p className="type-body-sm text-muted-soft mt-10 flex items-start gap-2">
          <Info size={15} strokeWidth={2} className="mt-0.5 shrink-0" />
          지역·지표·경로는 데모용 시뮬레이션 데이터이며, 점수는 Score_Area = 0.4·거래량 + 0.3·수요밀도
          + 0.3·예산적합도 로 계산한 100점 환산값입니다.
        </p>
      </div>

      {briefingArea && briefingRoute && (
        <RouteBriefingSheet
          area={briefingArea}
          route={briefingRoute}
          targetMinutes={targetMinutes}
          onClose={() => setBriefingAreaId(null)}
        />
      )}
    </main>
  );
}

const Group: React.FC<{
  title: string;
  description: string;
  areas: RecommendedArea[];
  deal: Deal;
  scoreOf: (area: RecommendedArea) => number;
  onSelect: (areaId: string) => void;
}> = ({ title, description, areas, deal, scoreOf, onSelect }) => {
  if (areas.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="type-title-md text-ink">{title}</h2>
      <p className="type-body-sm text-muted mt-1">{description}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {areas.map((area) => (
          <DiscoveryTownCard
            key={area.id}
            area={area}
            score={scoreOf(area)}
            transactionType={deal}
            onClick={() => onSelect(area.id)}
          />
        ))}
      </div>
    </section>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="type-badge text-ink mb-1.5 block uppercase">{label}</span>
    {children}
  </label>
);

const NumberInput: React.FC<{ value: number; onChange: (value: number) => void }> = ({
  value,
  onChange,
}) => (
  <input
    type="number"
    min={0}
    step={100}
    value={value}
    onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
    className="h-11 w-full rounded-sm border border-hairline bg-surface-soft px-3 type-body-sm text-ink focus:border-muted-soft focus:outline-none"
  />
);
