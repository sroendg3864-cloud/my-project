'use client';

import React from 'react';
import { LAYER_META } from '@/lib/layerTheme';
import { LayerCategory } from '@/types';

interface Props {
  overallScore: number;
  layerScores: Record<LayerCategory, number>;
  address: string;
}

const CATEGORIES: LayerCategory[] = ['SAFETY', 'EDUCATION', 'LIVING'];

export const RatingDisplayCard: React.FC<Props> = ({ overallScore, layerScores, address }) => {
  return (
    <section className="rounded-md border border-hairline-soft bg-canvas p-6 shadow-card-float">
      <p className="type-body-sm text-muted">{address}</p>

      <div className="mt-4 flex items-end justify-center gap-2">
        <span className="type-rating-display text-ink">{overallScore.toFixed(1)}</span>
        <span className="type-body-md text-muted pb-3">/ 5.0</span>
      </div>
      <p className="type-caption text-muted mt-1 text-center">종합 거주 평점</p>

      <ul className="mt-7 space-y-4">
        {CATEGORIES.map((category) => {
          const meta = LAYER_META[category];
          const score = layerScores[category] ?? 0;
          return (
            <li key={category}>
              <div className="flex items-baseline justify-between">
                <span className="type-caption" style={{ color: meta.color }}>
                  {meta.label}
                </span>
                <span className="type-body-sm text-body">
                  {score > 0 ? score.toFixed(1) : '미평가'}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-strong">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${(score / 5) * 100}%`, backgroundColor: meta.color }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default RatingDisplayCard;
