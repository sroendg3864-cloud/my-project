'use client';

import React, { useRef } from 'react';
import { Camera, Check, Star, X } from 'lucide-react';
import { LAYER_META } from '@/lib/layerTheme';
import { CheckItem, Waypoint } from '@/types';

interface Props {
  waypoint: Waypoint;
  onAnswer: (checkItemId: string, value: boolean | number | string) => void;
  onComplete: () => void;
  photoDataUrl?: string;
  onCapturePhoto?: (file: File) => void;
}

/** TEXT(메모)는 선택 입력 — BOOLEAN/RATING만 모두 응답하면 완료 가능 */
export const isCheckItemAnswered = (item: CheckItem): boolean => {
  if (item.type === 'BOOLEAN') return typeof item.value === 'boolean';
  if (item.type === 'RATING') return typeof item.value === 'number' && item.value > 0;
  return true;
};

export const CheckpointCard: React.FC<Props> = ({
  waypoint,
  onAnswer,
  onComplete,
  photoDataUrl,
  onCapturePhoto,
}) => {
  const meta = LAYER_META[waypoint.category];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const allAnswered = waypoint.checkItems.every(isCheckItemAnswered);

  return (
    <section
      className="relative overflow-hidden rounded-lg border border-hairline-soft bg-canvas shadow-card-float transition-colors duration-300"
      style={allAnswered ? { backgroundColor: '#fff0f2' } : undefined}
    >
      <span
        className="absolute left-0 top-0 h-full w-1"
        style={{ backgroundColor: meta.color }}
        aria-hidden
      />

      <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="min-w-0">
          <p className="type-title-sm text-ink">{waypoint.name}</p>
          <p className="type-body-sm text-muted mt-1">{meta.description}</p>
        </div>
        <span
          className="type-badge shrink-0 rounded-full px-2.5 py-1"
          style={{ color: meta.color, backgroundColor: meta.softBg }}
        >
          {meta.label}
        </span>
      </header>

      <div className="max-h-[38vh] overflow-y-auto px-5 pb-2">
        <ul className="divide-y divide-hairline-soft">
          {waypoint.checkItems.map((item) => (
            <li key={item.id} className="py-4">
              <p className="type-body-sm text-body">{item.question}</p>

              {item.type === 'BOOLEAN' && (
                <div className="mt-2.5 flex gap-2">
                  {[true, false].map((option) => {
                    const selected = item.value === option;
                    return (
                      <button
                        key={String(option)}
                        type="button"
                        onClick={() => onAnswer(item.id, option)}
                        className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-sm border type-caption transition-colors ${
                          selected
                            ? 'border-primary bg-primary text-on-primary'
                            : 'border-hairline bg-surface-soft text-body hover:border-muted-soft'
                        }`}
                      >
                        {option ? <Check size={15} strokeWidth={2.5} /> : <X size={15} strokeWidth={2.5} />}
                        {option ? '예' : '아니오'}
                      </button>
                    );
                  })}
                </div>
              )}

              {item.type === 'RATING' && (
                <div className="mt-2.5 flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((score) => {
                    const active = typeof item.value === 'number' && item.value >= score;
                    return (
                      <button
                        key={score}
                        type="button"
                        aria-label={`${score}점`}
                        onClick={() => onAnswer(item.id, score)}
                        className="p-1 transition-transform active:scale-90"
                      >
                        <Star
                          size={26}
                          strokeWidth={1.8}
                          className={active ? 'text-primary' : 'text-hairline'}
                          fill={active ? '#ff385c' : 'none'}
                        />
                      </button>
                    );
                  })}
                  <span className="type-body-sm text-muted ml-1">
                    {typeof item.value === 'number' ? `${item.value}점` : '미응답'}
                  </span>
                </div>
              )}

              {item.type === 'TEXT' && (
                <textarea
                  value={typeof item.value === 'string' ? item.value : ''}
                  onChange={(event) => onAnswer(item.id, event.target.value)}
                  rows={2}
                  placeholder="선택 입력 — 리포트 타임라인에 그대로 기록됩니다"
                  className="mt-2.5 w-full resize-none rounded-sm border border-hairline bg-surface-soft px-3 py-2.5 type-body-sm text-body placeholder:text-muted-soft focus:border-muted-soft focus:outline-none"
                />
              )}
            </li>
          ))}
        </ul>

        {onCapturePhoto && (
          <div className="flex items-center gap-3 border-t border-hairline-soft py-4">
            {photoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoDataUrl}
                alt="현장 사진"
                className="h-14 w-14 rounded-sm object-cover"
              />
            ) : null}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-10 items-center gap-2 rounded-sm border border-hairline bg-surface-soft px-4 type-caption text-body hover:border-muted-soft"
            >
              <Camera size={16} strokeWidth={2} />
              {photoDataUrl ? '사진 다시 찍기' : '현장 사진 남기기'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onCapturePhoto(file);
                event.target.value = '';
              }}
            />
          </div>
        )}
      </div>

      <footer className="px-5 pb-5 pt-2">
        <button
          type="button"
          disabled={!allAnswered}
          onClick={onComplete}
          className={`h-12 w-full rounded-sm type-title-sm transition-colors ${
            allAnswered
              ? 'bg-primary text-on-primary hover:bg-primary-active active:scale-[0.99]'
              : 'cursor-not-allowed bg-primary-disabled text-on-primary'
          }`}
        >
          {allAnswered ? '이 체크포인트 완료' : '모든 항목에 응답해주세요'}
        </button>
      </footer>
    </section>
  );
};

export default CheckpointCard;
