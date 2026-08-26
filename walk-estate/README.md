# WalkEstate (임장로드)

부동산 임장 입문자부터 실전 투자자까지 사용하는 **스마트 지역 탐색 + 현장 도보 임장 솔루션**입니다.
가용 예산과 지역 데이터(거래량·수요밀도)로 임장 후보지를 추천하고, 현장에서는 보행 전용 경로와
스마트 체크리스트로 안전·교육·주거 환경을 검증합니다.

`WalkEstate_Blueprint.md`의 설계를 그대로 구현한 Next.js(App Router) + TypeScript + Tailwind CSS v4 프로젝트입니다.

## 실행

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # 프로덕션 빌드 (20개 루트 정적 생성)
npm run lint
```

## 화면 흐름

| 경로 | 화면 | 설명 |
|---|---|---|
| `/` | 홈 & 스마트 탐색 | 4-세그먼트 알약 검색바 + 테마별 추천 동네 카드(거래량 1위 / 정주형 대단지 / 예산 맞춤형) |
| `/`(카드 클릭) | 루트 브리핑 시트 | 시뮬레이션 경로 미리보기, 총 거리·도보 시간·구간별 경사 브리핑 |
| `/live/[routeId]` | 실시간 현장 임장 모드 | 전체 화면 경로 캔버스 + 체크포인트 바텀시트 + 하단 진행률 HUD |
| `/report/[routeId]` | 임장 완료 리포트 | 64px 종합 거주 평점, 레이어별 득점, 사진·메모 타임라인, PDF/Notion 내보내기 |

## 핵심 로직

| 항목 | 구현 위치 | 수식 |
|---|---|---|
| 매매 상한가 | `src/utils/finance.ts` | `(가용현금 + min(LTV 상한액, DSR 40% 한도)) × 0.965` |
| 전세 상한가 | `src/utils/finance.ts` | `가용현금 + min(보증금 80%, 연소득 × 4.0)` |
| 지역 스코어링 | `src/utils/scoring.ts` | `Score_Area = 0.4·S_Turnover + 0.3·S_Density + 0.3·S_BudgetFit` (0~100 환산 표기) |
| 예상 소요 시간 | `src/utils/scoring.ts` | `ceil(총 거리 / 80m·분)` + 체크포인트당 3분, 급경사 구간은 `applySlopeAdjustment()`로 1.2배 보정 |
| 최소 3개 추천 보장 | `src/utils/scoring.ts` | 예산 허용오차 0 → 20% → 40% → 60% → 테마 제거 → 전체 후보 순으로 단계적 완화 |

레이어 평점은 `RATING`(1~5점)과 `BOOLEAN`(예=5 / 아니오=2 환산)을 함께 평균 내며,
종합 거주 평점은 안전/교육/주거 세 레이어 평균입니다.

## 지도 — 시뮬레이션 캔버스

실제 지도 SDK(API 키·과금·도메인 등록) 없이 동작하도록 `SimulatedRouteCanvas.tsx`가 0~100 가상 평면
좌표를 SVG에 매핑합니다. 경로선(Rausch)·카테고리별 마커(안전 파랑 / 교육 보라 / 주거 청록)·현재 위치
핀 애니메이션을 렌더링하며, 실제 지도로 전환할 때는 `Waypoint`의 `x, y`를 `lat, lng`로 바꾸고 이
컴포넌트만 교체하면 됩니다.

## 데이터

- `src/data/simulatedRoutes.ts`: 예산 4티어 × 5개 = **20개 가상 지역**. 티어마다 테마 3종이 섞여 있어
  어떤 조건으로 검색해도 항상 3개 이상 추천됩니다.
- waypoint는 지역마다 손으로 정의하지 않고 `generateSimulatedWaypoints(area)`가 지역 이름 기반
  결정론적 시드로 카테고리별 3개씩 총 9개를 생성합니다(같은 지역이면 항상 같은 경로).
- 임장 진행 상황·응답·현장 사진(긴 변 480px JPEG로 축소)은 `localStorage`에 저장되어 새로고침 후에도
  이어서 진행하거나 리포트를 다시 볼 수 있습니다.

> 지역명·지표·경로·`LTV_RATE`/`DSR_MULTIPLIER`/`AREA_SCORE_WEIGHTS`는 모두 데모용 예시값입니다.
> 실서비스 전에 실거래·규제 데이터로 교체해야 합니다.

## 디자인 토큰

`src/app/globals.css`의 `@theme` 블록에 Airbnb 기반 토큰(Rausch `#ff385c`, 레이어 컬러, 라운딩,
elevation)이 정의되어 있고, 타이포 스케일은 `.type-*` 유틸리티 클래스로 노출됩니다.
현장 야외 시인성을 위해 라이트 캔버스로 고정했습니다.
