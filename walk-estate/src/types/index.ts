export type LayerCategory = 'SAFETY' | 'EDUCATION' | 'LIVING';
export type TransactionType = 'BUY' | 'JEONSE' | 'GAP';
export type RecommendationTheme = 'HOT_TRADING' | 'POPULAR_RESIDENTIAL' | 'BUDGET_PERFECT';

export interface UserFinancialProfile {
  availableCash: number;
  annualIncome: number;
  existingLoanAnnualRepayment: number;
  transactionType: TransactionType;
}

export interface CheckItem {
  id: string;
  question: string;
  type: 'BOOLEAN' | 'RATING' | 'TEXT';
  value?: boolean | number | string;
}

export interface Waypoint {
  id: string;
  order: number;
  name: string;
  category: LayerCategory;
  x: number;              // 시뮬레이션 캔버스 좌표 (0~100)
  y: number;               // 시뮬레이션 캔버스 좌표 (0~100)
  lat?: number;            // 실제 지도(카카오맵 등) 전환 시 사용, 시뮬레이션 단계에서는 미사용
  lng?: number;
  checkItems: CheckItem[];
  isCompleted: boolean;
}

export interface RecommendedArea {
  id: string;
  regionName: string;
  stationName: string;
  theme: RecommendationTheme;
  badgeLabel: string;
  priceRangeByType: {
    BUY: { min: number; max: number };    // 단위: 만원
    JEONSE: { min: number; max: number }; // 단위: 만원
  };
  metrics: {
    tradingVolumeLast3Months: number; // S_Turnover 원천 데이터
    demandDensity: number;            // S_Density 원천 데이터 (0~100)
    topDemographic: string;
  };
  highlightTags: string[];
  recommendedRouteId: string;
}

/** 시뮬레이션 루트 — waypoint 목록 + 2.4절 소요 시간 산출 결과 */
export interface SimulatedRoute {
  routeId: string;
  areaId: string;
  waypoints: Waypoint[];
  /** 구간 거리(m) 배열 — segmentDistances[i] = waypoint[i] → waypoint[i+1] */
  segmentDistances: number[];
  /** 구간별 경사 보정 계수 (1.0 = 평지) */
  segmentSlopeFactors: number[];
  totalDistanceMeters: number;
  walkMinutes: number;
  totalMinutes: number;
}

/** 현장 임장 세션 — localStorage에 저장되는 진행/응답 기록 */
export interface WalkSession {
  routeId: string;
  areaId: string;
  startedAt: string;
  finishedAt?: string;
  waypoints: Waypoint[];
  photos: Record<string, string>; // waypointId → 다운스케일된 dataURL
  totalDistanceMeters: number;
  walkMinutes: number;
  totalMinutes: number;
}
