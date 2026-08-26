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

/** 경로 데이터의 출처 — 실제 카카오 POI인지, 지역명 기반 시뮬레이션인지 */
export type RouteSource = 'KAKAO' | 'SIMULATION';

/** 도보 거리 계산 방식 */
export type WalkProvider = 'tmap-pedestrian' | 'straight-line' | 'simulation';

/** 루트 — waypoint 목록 + 2.4절 소요 시간 산출 결과 */
export interface SimulatedRoute {
  routeId: string;
  areaId: string;
  waypoints: Waypoint[];
  source: RouteSource;
  walkProvider: WalkProvider;
  /** 경사 정보를 신뢰할 수 있는 경로인지 (실데이터에는 고도 정보가 없어 false) */
  hasSlopeData: boolean;
  /** 지도 중심 (실좌표 모드에서만) */
  center?: { lat: number; lng: number };
  /** 구간별 실제 경로 좌표열 — 카카오 지도에 폴리라인으로 그린다 */
  pathLegs?: Array<Array<{ lat: number; lng: number }>>;
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
