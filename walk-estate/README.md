# WalkEstate (임장로드)

부동산 임장 입문자부터 실전 투자자까지 사용하는 **스마트 지역 탐색 + 현장 도보 임장 솔루션**입니다.
가용 예산과 지역 데이터(거래량·수요밀도)로 임장 후보지를 추천하고, 현장에서는 보행 전용 경로와
스마트 체크리스트로 안전·교육·주거 환경을 검증합니다.

`WalkEstate_Blueprint.md`의 설계를 그대로 구현한 Next.js(App Router) + TypeScript + Tailwind CSS v4 프로젝트입니다.

## 바로 보기 — 단일 HTML 데모

빌드·설치 없이 `demo/index.html`을 브라우저로 열면 전체 흐름이 그대로 동작합니다.
페이지 왼쪽에 카카오 **JavaScript 키**를 넣으면 체크포인트가 실제 장소로 바뀌고 지도도 카카오맵으로 그려집니다
(SDK의 `services` 라이브러리로 장소를 검색하므로 키 하나면 되고, 키는 브라우저에만 저장됩니다).
단 카카오 SDK는 등록된 도메인에서만 동작하므로 `file://`이 아니라 `npx serve demo` 같은 방식으로
`http://localhost`에 띄운 뒤 그 주소를 콘솔에 등록해야 합니다.
Next.js 앱과 같은 계산식(`finance.ts` / `scoring.ts`)과 같은 20개 지역을 한 파일에 옮겨 담았습니다.
키를 넣지 않으면 외부 의존성은 Google Fonts 하나뿐입니다(오프라인이면 시스템 폰트로 폴백).

```bash
open demo/index.html      # macOS
xdg-open demo/index.html  # Linux
```

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

## 지도와 장소 — 키 없이도 실제 데이터

지도는 도식이 아니라 **실제 도로망**입니다. `scripts/build-basemaps.mjs` 가 OpenStreetMap에서
지역별 도로·철도·공원·수계 지오메트리와 실제 POI를 미리 받아 `src/data/basemaps/*.json` 에 저장하고,
`RouteCanvas` 가 그 위에 도보 경로를 그립니다. 타일 요청도, API 키도, 과금도 없습니다.

```bash
node scripts/build-basemaps.mjs          # 20개 지역 전체 (Overpass 사용 정책상 지역당 12초 간격)
node scripts/build-basemaps.mjs c2 d1    # 특정 지역만
node scripts/build-basemaps.mjs --registry   # 레지스트리(index.ts)만 다시 생성
```

- 좌표계는 bbox 남서쪽을 원점으로 한 **미터 평면**이라 축척이 맞고, 도로 폭도 실제 m 단위로 그립니다.
- 체크포인트는 그 동네의 **실제 파출소·치안센터·초등학교·도서관·마트·공원·역**입니다.
  안전 지점이 모자라면 실제 도로명을 가진 생활도로 위에 "○○로 야간 보행 구간"으로 배치합니다.
- 걷는 순서는 최근접 이웃 + 2-opt로 정해 경로가 스스로 교차하지 않게 합니다.
- 데이터: © OpenStreetMap contributors (ODbL). 지역당 35~95KB.

## 실거래가 · 인구 데이터

| 지표 | 출처 | 상태 |
|---|---|---|
| 인구밀도 | 서울 자치구 인구/면적 (`scripts/build-population.mjs`) | **실데이터** — 저장소에 포함 |
| 시세(매매/전세 가격대) | 국토교통부 아파트 실거래가 25~75분위 | 키 필요 |
| 거래량 | 국토교통부 아파트 매매 건수 (동 단위 필터) | 키 필요 |

```bash
node scripts/build-population.mjs                          # 인구·면적 갱신
DATA_GO_KR_KEY=<서비스키> node scripts/build-market.mjs 3   # 최근 3개월 실거래가
```

`market.json` 이 비어 있으면 카드의 시세·거래량은 데모값으로 폴백하고, 화면에 "데모"라고 표시합니다.
스코어링(`Score_Area`)은 실데이터가 있으면 자동으로 그 값을 씁니다.

## 카카오맵 연동

키가 있으면 지도·체크포인트가 실제 데이터로 바뀌고, 없으면 아래 "시뮬레이션 캔버스"로 자동 폴백합니다.
어느 쪽이든 화면과 계산식은 동일합니다.

```bash
cp .env.example .env.local   # 키를 채운 뒤 npm run dev
```

| 키 | 용도 | 없으면 |
|---|---|---|
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 브라우저에서 카카오맵 렌더링 | SVG 시뮬레이션 캔버스로 렌더링 |
| `KAKAO_REST_API_KEY` | 서버에서 장소 검색 → 실제 체크포인트 구성 | 지역명 기반 가상 체크포인트 |
| `TMAP_APP_KEY` (선택) | 보행자 실경로 거리·시간 | 직선거리 × 1.25 근사 |

카카오 개발자 콘솔에서 **[플랫폼 > Web > 사이트 도메인]** 에 `http://localhost:3000` 을 반드시 등록해야
지도가 뜹니다. REST 키는 서버(route handler / 서버 컴포넌트)에서만 쓰이고 클라이언트로 나가지 않습니다.

### 무엇이 실제 데이터가 되나

| 항목 | 출처 | 상태 |
|---|---|---|
| 지도 · 좌표 | 카카오 JS 키가 있으면 카카오맵 타일, 없으면 OSM 실측 도로망 | 실데이터 |
| 체크포인트 장소 | 카카오 Local 장소 검색 (없으면 OSM POI) | 실데이터 |
| 도보 경로 · 거리 | **카카오 도보 길찾기는 제휴 파트너 전용**이라 일반 키로 못 씁니다. Tmap 보행자 경로안내 키가 있으면 실측, 없으면 직선거리 × 1.25 근사 | 근사 / 선택적 실측 |
| 경사 · 계단 | 카카오 Local API에 고도 정보가 없어 급경사 배지는 실좌표 모드에서 숨겨집니다 (`hasSlopeData: false`) | 미지원 |
| 거래량 · 수요밀도 | 국토부 실거래가 · 주민등록 인구 연동이 따로 필요 | 데모값 |

### 동작 방식

- `src/lib/kakao/resolveRoute.ts` — 역 좌표를 찾고 반경 1.2km에서 레이어별 시설 3곳씩을 고른 뒤,
  최근접 이웃 + 2-opt로 걷는 순서를 정합니다. 결과가 부족하면 시뮬레이션 루트로 폴백합니다.
- `src/lib/route/walk.ts` — 도보 거리 제공자(Tmap 실측 / 직선 근사)를 갈아끼울 수 있게 분리했습니다.
- `src/components/map/RouteMap.tsx` — 실좌표 루트 + JS 키가 있으면 카카오맵을, 아니면 SVG 캔버스를 그립니다.
  카카오맵 로딩이 실패해도 같은 자리에서 캔버스로 조용히 대체됩니다.
- POI·경로 응답은 하루 단위로 캐시(`revalidate: 86400`)해 호출 쿼터를 아낍니다.

## 지도 — 시뮬레이션 캔버스 (폴백)

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
