/**
 * 지역 지표 — 실데이터가 있으면 실데이터로, 없으면 데모값으로.
 *
 *   인구밀도  population.json  (위키백과 · 서울 자치구 인구/면적)     → 항상 실데이터
 *   시세·거래량 market.json     (국토교통부 아파트 실거래가, 키 필요)  → 키가 있을 때만
 *
 * 화면에는 어느 쪽인지 항상 함께 표시한다.
 */
import populationData from './population.json';
import marketData from './market.json';
import { districtOf } from './districts';
import { RecommendedArea } from '@/types';

type Provenance = 'REAL' | 'DEMO';

interface MarketArea {
  district: string;
  dong: string;
  tradeCount: number;
  districtTradeCount: number;
  buy: { min: number; max: number; median: number } | null;
  jeonse: { min: number; max: number; median: number } | null;
}

const MARKET = marketData as unknown as {
  fetchedAt: string | null;
  months: string[];
  areas: Record<string, MarketArea>;
};
const POPULATION = populationData as unknown as {
  fetchedAt: string;
  districts: Record<string, { population: number; areaKm2: number; densityPerKm2: number }>;
};

export const hasMarketData = Object.keys(MARKET.areas).length > 0;
export const marketFetchedAt = MARKET.fetchedAt;
export const marketMonths = MARKET.months;
export const populationFetchedAt = POPULATION.fetchedAt;

const densities = Object.values(POPULATION.districts).map((d) => d.densityPerKm2);
const MIN_DENSITY = Math.min(...densities);
const MAX_DENSITY = Math.max(...densities);

export interface AreaMetrics {
  priceRange: { BUY: { min: number; max: number }; JEONSE: { min: number; max: number } };
  /** 최근 집계 기간의 아파트 매매 거래 건수 */
  tradingVolume: number;
  /** 자치구 인구밀도 (명/km²) — 실데이터일 때만 */
  densityPerKm2: number | null;
  district: string | null;
  /** 스코어링용 0~100 정규화 수요밀도 */
  demandDensity: number;
  provenance: { price: Provenance; volume: Provenance; density: Provenance };
}

export function getAreaMetrics(area: RecommendedArea): AreaMetrics {
  const mapping = districtOf(area.id);
  const districtStats = mapping ? POPULATION.districts[mapping.district] : undefined;
  const market = MARKET.areas[area.id];

  const priceReal = Boolean(market?.buy && market?.jeonse);
  const priceRange = priceReal
    ? {
        BUY: { min: market.buy!.min, max: market.buy!.max },
        JEONSE: { min: market.jeonse!.min, max: market.jeonse!.max },
      }
    : area.priceRangeByType;

  const volumeReal = Boolean(market && market.tradeCount > 0);

  return {
    priceRange,
    tradingVolume: volumeReal ? market.tradeCount : area.metrics.tradingVolumeLast3Months,
    densityPerKm2: districtStats?.densityPerKm2 ?? null,
    district: mapping?.district ?? null,
    demandDensity: districtStats
      ? Math.round(((districtStats.densityPerKm2 - MIN_DENSITY) / (MAX_DENSITY - MIN_DENSITY)) * 100)
      : area.metrics.demandDensity,
    provenance: {
      price: priceReal ? 'REAL' : 'DEMO',
      volume: volumeReal ? 'REAL' : 'DEMO',
      density: districtStats ? 'REAL' : 'DEMO',
    },
  };
}
