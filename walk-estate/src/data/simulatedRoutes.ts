import { CheckItem, LayerCategory, RecommendedArea, Waypoint } from '@/types';

// 20개 시뮬레이션 지역 — regionName/stationName은 가상 데모용 예시입니다.
export const SIMULATED_AREAS: RecommendedArea[] = [
  // --- 티어 A: 저예산 (25,000~35,000 / 15,000~22,000) ---
  area('a1', '화곡동', '화곡역', 'BUDGET_PERFECT', '예산 맞춤형', [25000, 32000], [15000, 19000], 42, 58, '1인가구'),
  area('a2', '온수동', '온수역', 'HOT_TRADING', '거래량 1위', [27000, 34000], [16000, 20000], 71, 50, '신혼부부'),
  area('a3', '오류동', '오류동역', 'POPULAR_RESIDENTIAL', '정주형 대단지', [26000, 33000], [16000, 21000], 55, 66, '4인가구'),
  area('a4', '쌍문동', '쌍문역', 'BUDGET_PERFECT', '예산 맞춤형', [28000, 35000], [17000, 22000], 48, 60, '신혼부부'),
  area('a5', '중화동', '중화역', 'HOT_TRADING', '거래량 1위', [25000, 31000], [15000, 18000], 68, 47, '1인가구'),

  // --- 티어 B: 중저 (35,000~50,000 / 22,000~30,000) ---
  area('b1', '신정동', '신정네거리역', 'POPULAR_RESIDENTIAL', '정주형 대단지', [36000, 48000], [23000, 29000], 60, 70, '4인가구'),
  area('b2', '방화동', '방화역', 'HOT_TRADING', '거래량 1위', [38000, 50000], [24000, 30000], 74, 55, '신혼부부'),
  area('b3', '수유동', '수유역', 'BUDGET_PERFECT', '예산 맞춤형', [35000, 45000], [22000, 27000], 50, 62, '1인가구'),
  area('b4', '상봉동', '상봉역', 'POPULAR_RESIDENTIAL', '정주형 대단지', [40000, 49000], [25000, 30000], 58, 72, '4인가구'),
  area('b5', '개봉동', '개봉역', 'HOT_TRADING', '거래량 1위', [37000, 47000], [23000, 28000], 70, 53, '신혼부부'),

  // --- 티어 C: 중상 (50,000~70,000 / 30,000~45,000) ---
  area('c1', '봉천동', '서울대입구역', 'POPULAR_RESIDENTIAL', '정주형 대단지', [52000, 68000], [31000, 42000], 63, 75, '4인가구'),
  area('c2', '노량진', '노량진역', 'HOT_TRADING', '거래량 1위', [55000, 70000], [33000, 44000], 77, 60, '1인가구'),
  area('c3', '미아동', '미아사거리역', 'BUDGET_PERFECT', '예산 맞춤형', [50000, 63000], [30000, 38000], 52, 65, '신혼부부'),
  area('c4', '천호동', '천호역', 'HOT_TRADING', '거래량 1위', [53000, 69000], [32000, 43000], 72, 58, '4인가구'),
  area('c5', '구로디지털단지', '구로디지털단지역', 'POPULAR_RESIDENTIAL', '정주형 대단지', [54000, 67000], [31000, 41000], 65, 78, '1인가구'),

  // --- 티어 D: 고예산 (70,000~100,000 / 45,000~60,000) ---
  area('d1', '상수동', '상수역', 'HOT_TRADING', '거래량 1위', [75000, 98000], [46000, 58000], 80, 62, '신혼부부'),
  area('d2', '망원동', '망원역', 'POPULAR_RESIDENTIAL', '정주형 대단지', [72000, 95000], [45000, 56000], 66, 80, '4인가구'),
  area('d3', '연신내', '연신내역', 'BUDGET_PERFECT', '예산 맞춤형', [70000, 90000], [45000, 55000], 54, 68, '1인가구'),
  area('d4', '신길동', '신길역', 'HOT_TRADING', '거래량 1위', [78000, 100000], [47000, 60000], 82, 60, '신혼부부'),
  area('d5', '성내동', '강동구청역', 'POPULAR_RESIDENTIAL', '정주형 대단지', [74000, 96000], [46000, 57000], 64, 76, '4인가구'),
];

// 헬퍼: 배열 인자를 읽기 좋은 객체로 변환
function area(
  id: string, regionName: string, stationName: string,
  theme: RecommendedArea['theme'], badgeLabel: string,
  buyRange: [number, number], jeonseRange: [number, number],
  tradingVolume: number, demandDensity: number, topDemographic: string
): RecommendedArea {
  return {
    id, regionName, stationName, theme, badgeLabel,
    priceRangeByType: {
      BUY: { min: buyRange[0], max: buyRange[1] },
      JEONSE: { min: jeonseRange[0], max: jeonseRange[1] },
    },
    metrics: { tradingVolumeLast3Months: tradingVolume, demandDensity, topDemographic },
    highlightTags: [theme === 'HOT_TRADING' ? '#거래활발' : theme === 'POPULAR_RESIDENTIAL' ? '#정주형' : '#가성비', `#${topDemographic}`],
    recommendedRouteId: `route-${id}`,
  };
}

export const findAreaById = (areaId: string): RecommendedArea | undefined =>
  SIMULATED_AREAS.find((a) => a.id === areaId);

export const findAreaByRouteId = (routeId: string): RecommendedArea | undefined =>
  SIMULATED_AREAS.find((a) => a.recommendedRouteId === routeId);

/* ------------------------------------------------------------------ *
 * 시뮬레이션 waypoint 생성기
 * 지역마다 waypoint를 손으로 정의하지 않고, 지역 이름/지표에서 결정론적으로
 * 생성합니다. 좌표는 0~100 캔버스 평면이며, 실제 지도 전환 시에는
 * x, y 대신 lat, lng만 채워주면 동일한 인터페이스로 동작합니다.
 * ------------------------------------------------------------------ */

/** 캔버스 1 유닛 = 실제 몇 미터로 볼 것인지 (시뮬레이션 축척) */
export const SIMULATION_METERS_PER_UNIT = 15;

const CATEGORY_ORDER: LayerCategory[] = [
  'LIVING', 'SAFETY', 'EDUCATION',
  'LIVING', 'SAFETY', 'EDUCATION',
  'LIVING', 'SAFETY', 'EDUCATION',
];

const WAYPOINT_NAMES: Record<LayerCategory, string[]> = {
  LIVING: ['{station} 역세권 도보 구간', '{region} 생활 상권 & 마트', '{region} 근린공원 산책로'],
  SAFETY: ['{region} 안심귀갓길', '{region} 치안센터 앞 골목', '{region} 야간 가로등 구간'],
  EDUCATION: ['{region}초등학교 통학로', '{region} 학원가 밀집 구역', '{region} 통학 횡단보도'],
};

const CHECK_TEMPLATES: Record<LayerCategory, Array<Omit<CheckItem, 'id'>>> = {
  SAFETY: [
    { question: 'CCTV·비상벨이 사각지대 없이 설치되어 있나요?', type: 'BOOLEAN' },
    { question: '야간 가로등 밝기는 충분한가요?', type: 'RATING' },
    { question: '골목의 개방감과 체감 치안은 어떤가요?', type: 'RATING' },
    { question: '현장에서 느낀 점을 메모해주세요', type: 'TEXT' },
  ],
  EDUCATION: [
    { question: '차도와 분리된 안전한 통학로가 확보되어 있나요?', type: 'BOOLEAN' },
    { question: '횡단보도·신호 체계는 통학에 충분한가요?', type: 'RATING' },
    { question: '학원가·도서관 등 학습 인프라 접근성은 어떤가요?', type: 'RATING' },
    { question: '통학로에서 발견한 위험 요소를 메모해주세요', type: 'TEXT' },
  ],
  LIVING: [
    { question: '체감 도보 시간이 광고된 역세권 거리와 일치하나요?', type: 'BOOLEAN' },
    { question: '단차·경사 없이 평지 보행이 가능한가요?', type: 'RATING' },
    { question: '마트·병원 등 생활 편의시설 접근성은 어떤가요?', type: 'RATING' },
    { question: '주거 환경에 대한 인상을 메모해주세요', type: 'TEXT' },
  ],
};

/** 문자열 → 32bit 시드 (결정론적 좌표 생성용) */
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — 같은 지역이면 항상 같은 경로가 나오도록 */
function createRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const generateSimulatedWaypoints = (area: RecommendedArea): Waypoint[] => {
  const random = createRandom(hashSeed(area.id + area.regionName));
  const startAngle = random() * Math.PI * 2;
  const counters: Record<LayerCategory, number> = { SAFETY: 0, EDUCATION: 0, LIVING: 0 };

  return CATEGORY_ORDER.map((category, index) => {
    const nameIndex = counters[category] % WAYPOINT_NAMES[category].length;
    counters[category] += 1;

    // 도보 루프 형태로 배치 — 각도는 순서대로, 반경만 지역별로 흔들어 준다.
    const angle = startAngle + (index / CATEGORY_ORDER.length) * Math.PI * 2;
    const radius = 26 + random() * 12;
    const x = clampCoord(50 + Math.cos(angle) * radius + (random() - 0.5) * 6);
    const y = clampCoord(50 + Math.sin(angle) * radius * 0.82 + (random() - 0.5) * 6);

    const id = `${area.recommendedRouteId}-wp${index + 1}`;

    return {
      id,
      order: index + 1,
      name: WAYPOINT_NAMES[category][nameIndex]
        .replace('{region}', area.regionName)
        .replace('{station}', area.stationName),
      category,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      checkItems: CHECK_TEMPLATES[category].map((template, itemIndex) => ({
        ...template,
        id: `${id}-c${itemIndex + 1}`,
      })),
      isCompleted: false,
    } satisfies Waypoint;
  });
};

function clampCoord(value: number): number {
  return Math.min(94, Math.max(6, value));
}
