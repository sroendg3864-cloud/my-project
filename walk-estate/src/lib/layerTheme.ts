import { LayerCategory, RecommendationTheme } from '@/types';

export const LAYER_META: Record<
  LayerCategory,
  { label: string; color: string; softBg: string; description: string }
> = {
  SAFETY: {
    label: '안전환경',
    color: '#2a85ff',
    softBg: '#eaf2ff',
    description: '치안센터 · CCTV · 안심귀갓길',
  },
  EDUCATION: {
    label: '교육환경',
    color: '#7f56d9',
    softBg: '#f3eeff',
    description: '초등학교 · 학원가 · 통학로',
  },
  LIVING: {
    label: '주거환경',
    color: '#00a699',
    softBg: '#e6f7f5',
    description: '역세권 거리 · 마트 · 단차/경사 · 공원',
  },
};

/** 테마 배지 톤 매핑 (HOT_TRADING=primary, POPULAR_RESIDENTIAL=living, BUDGET_PERFECT=education) */
export const THEME_META: Record<
  RecommendationTheme,
  { color: string; softBg: string; label: string }
> = {
  HOT_TRADING: { color: '#ff385c', softBg: '#fff0f2', label: '거래량 1위' },
  POPULAR_RESIDENTIAL: { color: '#00a699', softBg: '#e6f7f5', label: '정주형 대단지' },
  BUDGET_PERFECT: { color: '#7f56d9', softBg: '#f3eeff', label: '예산 맞춤형' },
};

export const THEME_ORDER: RecommendationTheme[] = [
  'HOT_TRADING',
  'POPULAR_RESIDENTIAL',
  'BUDGET_PERFECT',
];
