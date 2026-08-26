'use client';

import React from 'react';
import { MapPin, TrendingUp, Users } from 'lucide-react';
import { THEME_META } from '@/lib/layerTheme';
import { formatKrwManwon } from '@/utils/finance';
import { RecommendedArea, TransactionType } from '@/types';

interface Props {
  area: RecommendedArea;
  score: number;
  onClick: () => void;
  transactionType?: Extract<TransactionType, 'BUY' | 'JEONSE'>;
}

export const DiscoveryTownCard: React.FC<Props> = ({
  area,
  score,
  onClick,
  transactionType = 'BUY',
}) => {
  const theme = THEME_META[area.theme];
  const range = area.priceRangeByType[transactionType];

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-canvas rounded-md border border-hairline-soft shadow-card-float p-4 transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span
        className="type-badge inline-flex items-center rounded-full px-2.5 py-1"
        style={{ color: theme.color, backgroundColor: theme.softBg }}
      >
        {area.badgeLabel}
      </span>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="type-title-md text-ink truncate">{area.regionName}</p>
          <p className="type-body-sm text-muted mt-0.5 flex items-center gap-1">
            <MapPin size={13} strokeWidth={2} className="shrink-0" />
            <span className="truncate">{area.stationName}</span>
          </p>
        </div>
        <span
          className="type-caption shrink-0 rounded-full px-2.5 py-1 text-on-primary"
          style={{ backgroundColor: theme.color }}
          title="Score_Area = 0.4·거래량 + 0.3·수요밀도 + 0.3·예산적합도"
        >
          {score.toFixed(1)}
        </span>
      </div>

      <p className="type-body-sm text-muted mt-3">
        {transactionType === 'BUY' ? '매매' : '전세'} {formatKrwManwon(range.min)} ~{' '}
        {formatKrwManwon(range.max)}
      </p>

      <div className="mt-3 flex items-center gap-3 type-body-sm text-muted-soft">
        <span className="flex items-center gap-1">
          <TrendingUp size={13} strokeWidth={2} />
          3개월 {area.metrics.tradingVolumeLast3Months}건
        </span>
        <span className="flex items-center gap-1">
          <Users size={13} strokeWidth={2} />
          {area.metrics.topDemographic}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {area.highlightTags.map((tag) => (
          <span
            key={tag}
            className="type-badge rounded-full bg-surface-soft px-2.5 py-1 text-body"
          >
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
};

export default DiscoveryTownCard;
