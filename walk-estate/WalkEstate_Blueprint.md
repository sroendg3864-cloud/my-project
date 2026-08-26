# WalkEstate (임장로드) — Product Blueprint

> Claude Code에 이 문서 전체를 붙여넣고 "이 블루프린트대로 Next.js 프로젝트를 구현해줘" 라고 요청하면 됩니다.

WalkEstate는 부동산 임장 입문자부터 실전 투자자까지 활용할 수 있는 **스마트 지역 탐색 및 현장 도보 임장 솔루션**입니다. 사용자의 가용 예산과 데이터(거래량, 인구)를 바탕으로 최적의 임장 후보지를 추천하고, 현장에서는 주거·교육·안전 환경을 검증할 수 있는 보행 전용 턴바이턴 경로와 스마트 체크리스트를 제공합니다.

---

## 1. Design System Tokens (Airbnb Foundation)

간결한 화이트 캔버스, Rausch 포인트 컬러, 소프트한 라운딩 형태를 기반으로 현장 야외 시인성과 조작 편의성을 극대화합니다.

```yaml
version: 1.0.0
name: walkestate-design-tokens
description: Clean, high-contrast walking field-study interface anchored on Airbnb design tokens.

colors:
  primary: "#ff385c"           # Rausch - 메인 CTA, 활성 루트 경로, 현재 위치 핀
  primary-active: "#e00b41"    # CTA 터치/액티브 상태
  primary-disabled: "#ffd1da"  # 비활성 버튼
  primary-soft: "#fff0f2"      # 체크포인트 완료 강조 배경
  ink: "#222222"               # 헤드라인, 텍스트, 평점 수치
  body: "#3f3f3f"              # 본문 텍스트, 체크리스트 상세 문구
  muted: "#6a6a6a"             # 서브 라벨, 거리/시간 메타 정보
  muted-soft: "#929292"        # 비활성 보조 텍스트
  hairline: "#dddddd"          # 1px 구분선 및 카드 테두리
  hairline-soft: "#ebebeb"     # 소프트 리스트 구분선
  canvas: "#ffffff"            # 기본 배경
  surface-soft: "#f7f7f7"      # 필터 칩 배경, 인풋 필드
  surface-strong: "#f2f2f2"    # 원형 아이콘 버튼 배경
  on-primary: "#ffffff"        # Rausch 배경 위 텍스트

  # Layer Categories (도보 체크포인트 전용 테마)
  layer-safety: "#2A85FF"      # 안전환경 (치안센터, CCTV, 안심귀갓길)
  layer-education: "#7F56D9"   # 교육환경 (초등학교, 학원가, 통학로)
  layer-living: "#00A699"      # 주거환경 (역세권 거리, 마트, 단차/경사, 공원)

typography:
  rating-display: { fontSize: "64px", fontWeight: "700", lineHeight: "1.1", letterSpacing: "-1px" }
  display-lg:     { fontSize: "22px", fontWeight: "600", lineHeight: "1.25", letterSpacing: "-0.4px" }
  title-md:       { fontSize: "16px", fontWeight: "600", lineHeight: "1.25", letterSpacing: "0" }
  title-sm:       { fontSize: "16px", fontWeight: "500", lineHeight: "1.25", letterSpacing: "0" }
  body-md:        { fontSize: "16px", fontWeight: "400", lineHeight: "1.5",  letterSpacing: "0" }
  body-sm:        { fontSize: "14px", fontWeight: "400", lineHeight: "1.43", letterSpacing: "0" }
  caption:        { fontSize: "14px", fontWeight: "500", lineHeight: "1.29", letterSpacing: "0" }
  badge:          { fontSize: "11px", fontWeight: "600", lineHeight: "1.18", letterSpacing: "0" }

rounded:
  sm: "8px"      # 인풋 필드, 기본 버튼
  md: "14px"     # 체크포인트 카드, 큐레이션 카드
  lg: "20px"     # 바텀시트 상단 모서리
  full: "9999px" # 알약 검색바, 필터 칩, 플로팅 버튼

elevation:
  card-float: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.1) 0 4px 8px 0"
  bottom-bar: "0 -2px 10px rgba(0,0,0,0.05)"
```

---

## 2. Core Logic & Mathematical Models

> ⚠️ **원본 문서에서 이 섹션의 수식(LaTeX/이미지)이 텍스트로 변환되며 소실되었습니다.**
> 아래는 실제 구현 코드(`finance.ts`)를 기준으로 역으로 정리한 설명이며, `Score_Area`(지역 추천 스코어링 가중치)와 `예상 소요 시간` 계산식은 원본에 값이 없어 **임의로 채우지 않았습니다.** 문서 하단 "확인이 필요한 사항"에서 여쭤볼게요.

### 2.1 매매 상한가 산출 (P_buy)
```
P_buy = (가용현금 + min(LTV 상한액, DSR 40% 기반 최대 대출액)) × 0.965
```
- `0.965`: 취득세, 법무사 비용, 중개보수 등 약 3.5% 부대비용을 차감한 실구매 기준 계수
- `LTV 상한액` = 매물 예상가 × `LTV_RATE`(지역/규제에 따라 변동, 기본값 예시 0.70) — 정확한 값은 지역별 규제 데이터 필요
- `DSR 40% 기반 최대 대출액` = ((연소득 × 0.4) − 기존 대출 연 상환액) × `DSR_MULTIPLIER`(대출 만기/금리에 따른 환산 배수, 기본값 예시 17.1)

### 2.2 전세 상한가 산출 (P_jeonse)
```
P_jeonse = 가용현금 + min(보증금의 80%, 연소득 × 4.0)
```
- `보증금의 80%`: 전세보증금반환보증 등에서 통용되는 대출 가능 비율
- `연소득 × 4.0`: 소득 기반 전세대출 한도 배수

### 2.3 지역 추천 스코어링 (Score_Area)
```
Score_Area = 0.4 × S_Turnover + 0.3 × S_Density + 0.3 × S_BudgetFit
```
- `S_Turnover`: 거래량(회전율) 정규화 점수 (0~1)
- `S_Density`: 인구/수요 밀도 정규화 점수 (0~1)
- `S_BudgetFit`: 예산 적합도 정규화 점수 (0~1) — `1 - |targetPrice - userMaxAffordable| / userMaxAffordable`

### 2.4 예상 소요 시간 연산

**20대 남자 평균 도보 속도**를 기준으로 계산합니다. 일반적으로 통용되는 값인 **분당 80m (시속 약 4.8km)**를 기준 속도로 사용합니다.

```
estimatedMinutes = ceil(totalRouteDistanceMeters / 80)
```

- 경사/계단 구간이 있는 waypoint 간 구간은 `slopeFactor`(예: 급경사 구간 1.2배)를 곱해 보정 가능하도록 `scoring.ts`에 `applySlopeAdjustment()` 훅을 열어둡니다.
- 체크포인트 관찰/응답 시간은 이 계산에 포함하지 않고, 별도로 waypoint당 평균 3분을 더해 "총 예상 소요 시간(이동+체크)"을 리포트에 별도 표기합니다.

---

## 3. UI/UX Structure & Screen Flow

### 3.1 스마트 탐색 & 4-세그먼트 검색바 (`search-bar-pill`)
- 알약형 디자인 (`rounded.full`, 높이 64px)
- 세그먼트: **[어디로(지역/추천)]** – **[거래유형(매매/전세)]** – **[가용예산(자본+소득)]** – **[목표시간(30~90분)]**
- 지역 미정 시 '거래량 1위', '정주형 대단지', '예산 맞춤형' 동네를 카드 형태로 추천

### 3.2 루트 브리핑 & 맵 뷰 (Map & Route Sheet)
- 보행 경로: `#ff385c`(Rausch) 실선 렌더링
- 카테고리별 마커: 안전(파랑) · 교육(보라) · 주거(청록)
- 구간별 경사도 브리핑 제공

### 3.3 실시간 현장 임장 모드 (Live Walk HUD)
- 현장 체크포인트 카드: 안전(CCTV 사각, 가로등), 교육(도보 통학로 실측, 횡단보도), 주거(단차, 마트 접근성) 관찰 질문
- 하단 스티키 바: 전체 진행률 프로그레스 바 + 48px Rausch 완료 버튼

### 3.4 임장 완료 리포트 (Walk Dossier)
- `rating-display` 64px 폰트로 종합 거주 평점 표출
- 레이어별 득점 분석 + 현장 사진/메모 타임라인
- Notion/PDF 내보내기 지원

---

## 4. Technical Architecture Blueprint

### 4.1 Directory Structure
```
walk-estate/
├── src/
│   ├── components/
│   │   ├── map/
│   │   │   └── SimulatedRouteCanvas.tsx # 가상 좌표 기반 SVG 도보 경로 시뮬레이터
│   │   ├── search/
│   │   │   ├── SearchBarPill.tsx        # 4-세그먼트 캡슐 검색바
│   │   │   └── DiscoveryTownCard.tsx    # 추천 동네 큐레이션 카드
│   │   ├── live/
│   │   │   ├── CheckpointCard.tsx       # 현장 체크리스트 카드
│   │   │   └── LiveBottomHUD.tsx        # 하단 진행률 스티키 HUD
│   │   └── report/
│   │       └── RatingDisplayCard.tsx    # 64px 거주 평점 컴포넌트
│   ├── types/
│   │   └── index.ts                     # 전체 데이터 타입 스키마
│   ├── utils/
│   │   ├── finance.ts                   # DSR/LTV 역산 엔진
│   │   └── scoring.ts                   # 추천 및 체크포인트 스코어링 (2.3/2.4 공식 구현)
│   └── app/
│       ├── page.tsx                     # 홈 & 스마트 탐색
│       ├── live/[routeId]/page.tsx      # 실시간 도보 임장 모드
│       └── report/[routeId]/page.tsx    # 결과 리포트
```

**지도: 실제 지도 SDK 없이 "시뮬레이션 캔버스"로 대체합니다.**
- 실제 위경도 대신, 각 루트마다 **0~100 범위의 가상 평면 좌표(x, y)** 를 가진 waypoint를 미리 정의해둡니다.
- `SimulatedRouteCanvas.tsx`는 SVG(또는 `<canvas>`) 위에 이 좌표들을 픽셀로 매핑해 (1) waypoint를 순서대로 잇는 경로선(`#ff385c`), (2) 카테고리별 마커(안전 파랑/교육 보라/주거 청록), (3) "현재 위치" 점을 경로를 따라 애니메이션으로 이동시키는 정도만 구현합니다.
- API 키·과금·도메인 등록이 전혀 필요 없어 바로 개발/데모가 가능하고, 나중에 실제 지도(카카오맵 등)로 교체할 때는 `waypoint.x, y`를 `lat, lng`로 바꿔치기만 하면 되도록 컴포넌트 인터페이스를 지도 SDK와 유사하게 설계합니다.
- 아래 4.6절의 "시뮬레이션 루트 데이터셋"이 이 캔버스가 그릴 실제 데이터입니다.

세부 설계는 아래 4.5절을 참고해 나머지 파일들을 채워 넣습니다.

### 4.2 Core Domain Types — `src/types/index.ts`
```ts
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
```

### 4.3 Financial Utils — `src/utils/finance.ts`
```ts
import { UserFinancialProfile } from '@/types';

// 지역별 규제에 따라 달라지는 값 — 기본값은 예시이며 실제 서비스 시 지역 데이터 연동 필요
export const LTV_RATE = 0.70;          // 매물 예상가 대비 LTV 상한 비율
export const DSR_MULTIPLIER = 17.1;    // DSR 40% 연 상환액 → 대출 한도 환산 배수

export const calculateMaxAffordablePrice = (
  profile: UserFinancialProfile,
  estimatedPropertyPrice?: number // BUY일 때 LTV 상한액 계산용
): number => {
  const { availableCash, annualIncome, existingLoanAnnualRepayment, transactionType } = profile;

  if (transactionType === 'BUY') {
    const ltvLimit = (estimatedPropertyPrice ?? availableCash * 3) * LTV_RATE;
    const maxAnnualDebtService = Math.max(0, (annualIncome * 0.4) - existingLoanAnnualRepayment);
    const dsrLoanLimit = maxAnnualDebtService * DSR_MULTIPLIER;
    const loanLimit = Math.min(ltvLimit, dsrLoanLimit);
    return Math.floor((availableCash + loanLimit) * 0.965);
  }

  if (transactionType === 'JEONSE') {
    // 전세: 보증금의 80% vs 연소득×4.0 중 작은 값을 대출 한도로 사용
    const depositBasedLimit = availableCash * 0.8; // 보증금(가용현금 기준) 80%
    const incomeBasedLimit = annualIncome * 4.0;
    const loanLimit = Math.min(depositBasedLimit, incomeBasedLimit);
    return Math.floor(availableCash + loanLimit);
  }

  return availableCash;
};
```

### 4.4 Core Components

#### `src/components/search/SearchBarPill.tsx`
```tsx
import React from 'react';
import { Search } from 'lucide-react';

interface Props {
  location: string;
  transactionType: string;
  budgetText: string;
  durationText: string;
  onSearch: () => void;
}

export const SearchBarPill: React.FC<Props> = ({
  location, transactionType, budgetText, durationText, onSearch
}) => {
  return (
    <div className="flex items-center bg-white h-16 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.1)] border border-[#dddddd] px-2 py-1 max-w-3xl w-full mx-auto">
      <div className="flex-1 px-4 border-r border-[#ebebeb] text-left cursor-pointer">
        <span className="block text-[11px] font-semibold text-[#222222] uppercase">지역</span>
        <span className="text-[14px] text-[#222222] font-medium truncate block">{location || '어디든 추천'}</span>
      </div>
      <div className="flex-1 px-4 border-r border-[#ebebeb] text-left cursor-pointer hidden md:block">
        <span className="block text-[11px] font-semibold text-[#222222] uppercase">유형</span>
        <span className="text-[14px] text-[#222222] font-medium truncate block">{transactionType || '매매'}</span>
      </div>
      <div className="flex-1 px-4 border-r border-[#ebebeb] text-left cursor-pointer">
        <span className="block text-[11px] font-semibold text-[#222222] uppercase">가용 예산</span>
        <span className="text-[14px] text-[#6a6a6a] truncate block">{budgetText || '자산 입력'}</span>
      </div>
      <div className="flex-1 px-4 text-left cursor-pointer hidden sm:block">
        <span className="block text-[11px] font-semibold text-[#222222] uppercase">소요 시간</span>
        <span className="text-[14px] text-[#6a6a6a] truncate block">{durationText || '60분'}</span>
      </div>
      <button
        onClick={onSearch}
        className="w-12 h-12 bg-[#ff385c] hover:bg-[#e00b41] active:scale-95 transition-all rounded-full flex items-center justify-center text-white shrink-0 ml-1"
      >
        <Search size={20} strokeWidth={2.5} />
      </button>
    </div>
  );
};
```

#### `src/components/live/LiveBottomHUD.tsx`
```tsx
import React from 'react';

interface Props {
  currentStep: number;
  totalSteps: number;
  nextWaypointName: string;
  onCompleteStep: () => void;
}

export const LiveBottomHUD: React.FC<Props> = ({ currentStep, totalSteps, nextWaypointName, onCompleteStep }) => {
  const progressPercent = (currentStep / totalSteps) * 100;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#dddddd] shadow-[0_-2px_10px_rgba(0,0,0,0.05)] px-6 py-4 z-40">
      <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[12px] font-bold text-[#ff385c] tracking-tight">STEP {currentStep}/{totalSteps}</span>
            <span className="text-[14px] font-semibold text-[#222222] truncate">{nextWaypointName}</span>
          </div>
          <div className="w-full bg-[#f2f2f2] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#ff385c] h-full transition-all duration-300 rounded-full" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
        <button
          onClick={onCompleteStep}
          className="h-12 px-6 bg-[#ff385c] hover:bg-[#e00b41] active:scale-[0.98] text-white rounded-[8px] font-medium text-[15px] transition-colors shrink-0 shadow-sm"
        >
          체크 완료
        </button>
      </div>
    </div>
  );
};
```

### 4.5 미구현 파일 설계 스펙

Claude Code가 일관된 스타일로 이어서 구현할 수 있도록, 각 파일의 props/역할/디자인 토큰 사용처를 아래처럼 미리 정의해둡니다.

#### `src/utils/scoring.ts`
```ts
// 2.3 지역 스코어링
export const AREA_SCORE_WEIGHTS = { turnover: 0.4, density: 0.3, budgetFit: 0.3 };
export const calculateAreaScore = (area: RecommendedArea, userMaxAffordable: number, allAreas: RecommendedArea[]): number => { /* normalize + 가중합, 2.3 공식(Score_Area = 0.4·S_Turnover + 0.3·S_Density + 0.3·S_BudgetFit) 구현 */ };

// 2.4 소요 시간
export const AVG_WALK_SPEED_M_PER_MIN = 80; // 20대 남자 평균 도보 속도
export const CHECKPOINT_AVG_MINUTES = 3;
export const estimateWalkMinutes = (totalDistanceMeters: number, slopeFactor?: number): number => { /* ceil(distance / speed) × slopeFactor */ };
export const estimateTotalMinutes = (walkMinutes: number, waypointCount: number): number => { /* walkMinutes + waypointCount × CHECKPOINT_AVG_MINUTES */ };

// 체크포인트/종합 평점
export const calculateLayerScore = (waypoints: Waypoint[], category: LayerCategory): number => { /* 카테고리별 RATING 타입 CheckItem 평균 */ };
export const calculateOverallRating = (waypoints: Waypoint[]): number => { /* SAFETY/EDUCATION/LIVING 평균, 5점 만점 → rating-display용 */ };
```

#### `src/components/search/DiscoveryTownCard.tsx`
- Props: `{ area: RecommendedArea; score: number; onClick: () => void }`
- 레이아웃: `rounded.md`(14px) 카드, `elevation.card-float` 그림자
- 상단: `badgeLabel`을 테마 컬러 배지로 (HOT_TRADING=primary, POPULAR_RESIDENTIAL=layer-living, BUDGET_PERFECT=layer-education 톤 매핑)
- 본문: `regionName` + `stationName` (`title-md`), 가격 범위 `body-sm`(`muted`), `highlightTags`를 `surface-soft` 배경의 필칩(`rounded.full`)으로 나열
- 하단: `score`를 소수점 1자리 배지로 우측 정렬 표시

#### `src/components/live/CheckpointCard.tsx`
- Props: `{ waypoint: Waypoint; onAnswer: (checkItemId: string, value: boolean | number | string) => void; onComplete: () => void }`
- 카테고리별 좌측 컬러 바 4px: `layer-safety` / `layer-education` / `layer-living`
- 카드 상단: waypoint `name` (`title-sm`) + 카테고리 뱃지
- `checkItems` 순회: `BOOLEAN`은 Yes/No 토글, `RATING`은 1~5 별점, `TEXT`는 인풋 필드 (`surface-soft` 배경, `rounded.sm`)
- 모두 응답 완료 시 카드 배경이 `primary-soft`로 전환되고 완료 버튼 활성화 → `onComplete` 호출

#### `src/components/report/RatingDisplayCard.tsx`
- Props: `{ overallScore: number; layerScores: Record<LayerCategory, number>; address: string }`
- 중앙: `overallScore` (`rating-display`, 64px, `ink`)
- 하단: 3개 레이어 점수를 각 컬러(`layer-safety/education/living`)의 미니 바 차트 or 원형 게이지로 표시
- 최상단: `address` (`body-sm`, `muted`)

#### `src/app/page.tsx` (홈 & 스마트 탐색)
- `SearchBarPill` 상단 고정 + 하단에 `DiscoveryTownCard` 리스트(테마별 3개 그룹: 거래량 1위 / 정주형 대단지 / 예산 맞춤형)
- 검색 시 `calculateMaxAffordablePrice` → `calculateAreaScore`로 정렬된 리스트 재계산

#### `src/app/live/[routeId]/page.tsx` (실시간 도보 임장 모드)
- `SimulatedRouteCanvas` 전체 화면 배경(가상 좌표 SVG) + 상단 반투명 헤더(현재 waypoint 안내)
- 다음 waypoint 도착 시 `CheckpointCard`를 바텀시트(`rounded.lg` 상단 모서리)로 슬라이드업
- 최하단 `LiveBottomHUD` 고정

#### `src/app/report/[routeId]/page.tsx` (결과 리포트)
- 상단 `RatingDisplayCard`
- 하단 waypoint별 사진/메모 타임라인 (세로 타임라인, 각 항목에 카테고리 컬러 도트)
- Notion/PDF 내보내기 버튼 (`primary` CTA, `rounded.sm`)

### 4.6 시뮬레이션 루트 데이터셋 & "최소 3개 추천" 보장 알고리즘

실제 지도/실거래 데이터 없이도 스마트 탐색이 동작하도록, **20개의 가상 지역 루트**를 미리 정의합니다. 각 지역은 매매/전세 예산대, 테마, 지표를 갖고 있어 어떤 조건으로 검색해도 항상 3개 이상 추천되도록 설계했습니다.

#### 예산 티어 설계 (매매 기준, 단위: 만원)
| 티어 | 매매 예산대 | 전세 예산대 | 포함 지역 수 |
|---|---|---|---|
| A (저예산) | 25,000~35,000 | 15,000~22,000 | 5개 |
| B (중저) | 35,000~50,000 | 22,000~30,000 | 5개 |
| C (중상) | 50,000~70,000 | 30,000~45,000 | 5개 |
| D (고예산) | 70,000~100,000 | 45,000~60,000 | 5개 |

각 티어 안에 테마(`HOT_TRADING` / `POPULAR_RESIDENTIAL` / `BUDGET_PERFECT`)가 골고루 섞여 있어, 예산 필터만 걸어도 최소 5개 후보가 나오고, 테마까지 좁혀도 대부분 2개 이상은 남습니다.

#### `src/data/simulatedRoutes.ts`
```ts
import { RecommendedArea } from '@/types';

// 20개 시뮬레이션 지역 — regionName/stationName은 가상 데모용 예시입니다.
export const SIMULATED_AREAS: RecommendedArea[] = [
  // --- 티어 A: 저예산 (25,000~35,000 / 15,000~22,000) ---
  area('a1', '화곡동', '화곡역', 'BUDGET_PERFECT', '예산 맞춤형', [25000,32000], [15000,19000], 42, 58, '1인가구'),
  area('a2', '온수동', '온수역', 'HOT_TRADING',     '거래량 1위',   [27000,34000], [16000,20000], 71, 50, '신혼부부'),
  area('a3', '오류동', '오류동역', 'POPULAR_RESIDENTIAL','정주형 대단지',[26000,33000], [16000,21000], 55, 66, '4인가구'),
  area('a4', '쌍문동', '쌍문역', 'BUDGET_PERFECT', '예산 맞춤형', [28000,35000], [17000,22000], 48, 60, '신혼부부'),
  area('a5', '중화동', '중화역', 'HOT_TRADING',     '거래량 1위',   [25000,31000], [15000,18000], 68, 47, '1인가구'),

  // --- 티어 B: 중저 (35,000~50,000 / 22,000~30,000) ---
  area('b1', '신정동', '신정네거리역', 'POPULAR_RESIDENTIAL','정주형 대단지',[36000,48000], [23000,29000], 60, 70, '4인가구'),
  area('b2', '방화동', '방화역', 'HOT_TRADING',     '거래량 1위',   [38000,50000], [24000,30000], 74, 55, '신혼부부'),
  area('b3', '수유동', '수유역', 'BUDGET_PERFECT', '예산 맞춤형', [35000,45000], [22000,27000], 50, 62, '1인가구'),
  area('b4', '상봉동', '상봉역', 'POPULAR_RESIDENTIAL','정주형 대단지',[40000,49000], [25000,30000], 58, 72, '4인가구'),
  area('b5', '개봉동', '개봉역', 'HOT_TRADING',     '거래량 1위',   [37000,47000], [23000,28000], 70, 53, '신혼부부'),

  // --- 티어 C: 중상 (50,000~70,000 / 30,000~45,000) ---
  area('c1', '봉천동', '서울대입구역', 'POPULAR_RESIDENTIAL','정주형 대단지',[52000,68000], [31000,42000], 63, 75, '4인가구'),
  area('c2', '노량진', '노량진역', 'HOT_TRADING',     '거래량 1위',   [55000,70000], [33000,44000], 77, 60, '1인가구'),
  area('c3', '미아동', '미아사거리역', 'BUDGET_PERFECT', '예산 맞춤형', [50000,63000], [30000,38000], 52, 65, '신혼부부'),
  area('c4', '천호동', '천호역', 'HOT_TRADING',     '거래량 1위',   [53000,69000], [32000,43000], 72, 58, '4인가구'),
  area('c5', '구로디지털단지', '구로디지털단지역', 'POPULAR_RESIDENTIAL','정주형 대단지',[54000,67000], [31000,41000], 65, 78, '1인가구'),

  // --- 티어 D: 고예산 (70,000~100,000 / 45,000~60,000) ---
  area('d1', '상수동', '상수역', 'HOT_TRADING',     '거래량 1위',   [75000,98000], [46000,58000], 80, 62, '신혼부부'),
  area('d2', '망원동', '망원역', 'POPULAR_RESIDENTIAL','정주형 대단지',[72000,95000], [45000,56000], 66, 80, '4인가구'),
  area('d3', '연신내', '연신내역', 'BUDGET_PERFECT', '예산 맞춤형', [70000,90000], [45000,55000], 54, 68, '1인가구'),
  area('d4', '신길동', '신길역', 'HOT_TRADING',     '거래량 1위',   [78000,100000],[47000,60000], 82, 60, '신혼부부'),
  area('d5', '성내동', '강동구청역', 'POPULAR_RESIDENTIAL','정주형 대단지',[74000,96000], [46000,57000], 64, 76, '4인가구'),
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
```

#### 최소 3개 추천 보장 — `src/utils/scoring.ts`

검색 조건(예산, 거래유형, 테마)으로 필터링했을 때 결과가 3개 미만이면, **조건을 단계적으로 완화**하며 최소 3개를 채웁니다.

```ts
export const recommendAreas = (
  userMaxAffordable: number,
  transactionType: 'BUY' | 'JEONSE',
  preferredTheme?: RecommendationTheme,
  minResults = 3
): RecommendedArea[] => {

  const fitsBudget = (area: RecommendedArea, tolerance: number) => {
    const { min, max } = area.priceRangeByType[transactionType];
    const widenedMin = min * (1 - tolerance);
    const widenedMax = max * (1 + tolerance);
    return userMaxAffordable >= widenedMin && userMaxAffordable <= widenedMax;
  };

  // 1단계: 테마 + 예산 정확 매칭
  let candidates = SIMULATED_AREAS.filter(a =>
    (!preferredTheme || a.theme === preferredTheme) && fitsBudget(a, 0)
  );

  // 2단계: 테마 유지, 예산 허용오차 20% → 40% → 60%로 단계적 완화
  for (const tolerance of [0.2, 0.4, 0.6]) {
    if (candidates.length >= minResults) break;
    candidates = SIMULATED_AREAS.filter(a =>
      (!preferredTheme || a.theme === preferredTheme) && fitsBudget(a, tolerance)
    );
  }

  // 3단계: 테마 조건 제거, 예산만으로 재시도
  if (candidates.length < minResults) {
    candidates = SIMULATED_AREAS.filter(a => fitsBudget(a, 0.6));
  }

  // 4단계: 최종 안전장치 — 그래도 부족하면 Score_Area 상위 N개로 채움
  if (candidates.length < minResults) {
    candidates = [...SIMULATED_AREAS];
  }

  return candidates
    .map(a => ({ area: a, score: calculateAreaScore(a, userMaxAffordable) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, Math.max(minResults, 3))
    .map(x => x.area);
};
```

- 홈 화면(`app/page.tsx`)의 3개 추천 그룹(거래량 1위 / 정주형 대단지 / 예산 맞춤형)은 `preferredTheme`을 각각 `HOT_TRADING` / `POPULAR_RESIDENTIAL` / `BUDGET_PERFECT`로 고정 호출해서 구성하며, 각 그룹도 이 함수로 항상 최소 3개가 보장됩니다.
- waypoint(도보 체크포인트)는 매 지역마다 새로 만들지 않고, `generateSimulatedWaypoints(area)` 같은 공용 생성 함수로 카테고리별(안전/교육/주거) 3~4개 지점을 그 지역 이름에 맞춰 자동 생성해 데이터량을 줄입니다 (좌표는 0~100 사이 임의 배치 + 경로 순서만 의미 있게 정렬).

1. 새 Next.js(App Router) + TypeScript + Tailwind 프로젝트를 생성합니다.
2. 이 문서의 "4. Technical Architecture Blueprint"에 정의된 디렉토리 구조를 그대로 생성합니다.
3. `types/index.ts`, `utils/finance.ts`, `SearchBarPill.tsx`, `LiveBottomHUD.tsx`는 문서의 코드를 그대로 사용합니다.
4. 문서에 정의만 있고 코드가 없는 `DiscoveryTownCard.tsx`, `CheckpointCard.tsx`, `RatingDisplayCard.tsx`, `scoring.ts`, 3개의 `page.tsx`는 "1. Design System Tokens"와 "3. UI/UX Structure"의 설명에 맞춰 새로 구현합니다.
5. 지도/보행 경로 렌더링은 실제 지도 API(카카오맵/네이버맵/Mapbox 등) 연동이 필요하므로 어떤 지도 SDK를 쓸지 결정 후 진행합니다.

---

## ✅ 확정된 사항 (v1.3)

- **매매/전세 상한가, 지역 스코어링 수식**: 원본 캡처의 정확한 공식(P_buy, P_jeonse, Score_Area = 0.4·Turnover + 0.3·Density + 0.3·BudgetFit)으로 교체 완료 (2절)
- **예상 소요 시간**: 20대 남자 평균 도보 속도 분당 80m 기준 (2.4절)
- **지도**: 실제 SDK 대신 가상 좌표 기반 시뮬레이션 캔버스(`SimulatedRouteCanvas.tsx`)로 대체 — API 키/과금 불필요, 추후 실제 지도로 교체 용이하게 인터페이스 설계 (4절)
- **시뮬레이션 데이터셋**: 예산 4티어 × 5개씩 총 20개 가상 지역 루트, 테마 3종이 각 티어에 골고루 분포 (4.6절)
- **최소 3개 추천 보장 알고리즘**: 예산/테마 조건을 단계적으로 완화(±20%→40%→60%→테마 제거→전체 후보)해 항상 3개 이상 반환 (4.6절)
- **미구현 파일**: 4.5절에 props/역할/스타일 스펙으로 미리 설계 완료

## ⚠️ 참고로 확인하면 좋은 것 (선택)

- `AREA_SCORE_WEIGHTS`, 예산 티어 구간, 20개 지역의 실제 이름/지표는 데모용 예시입니다. 실서비스 전에 실거래 데이터로 교체하시면 됩니다.
- 나중에 실제 지도로 전환할 때는 `Waypoint`의 `x, y`를 `lat, lng`로, `SimulatedRouteCanvas`를 카카오맵 등 실제 SDK 컴포넌트로만 바꿔 끼우면 되도록 설계해뒀습니다.
