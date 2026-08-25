# 인시던트 레이더 — Claude Code 이어받기 노트

## 지금까지 만든 것
전국 사고 속보를 지도로 보여주고, 삼성화재 계약 연관 여부(가상 데이터)를 확인하는 대시보드입니다.
현재는 Claude Cowork의 "Artifact"로 배포된 **정적 1파일 웹앱**입니다 (백엔드 없음).

- **배포 주소**: https://claude.ai/code/artifact/2c98808f-01ec-4ec7-a113-9476b844e8fa
- **핵심 파일**: `app.html` — 이 파일 하나가 전부입니다 (HTML+CSS+JS, 지도 SVG와 초기 더미데이터가 플레이스홀더로 들어있음)
- `gen_state.py` — 초기 사고/계약 더미데이터 12건을 생성하는 스크립트 → `initial_state.json` 출력
- `korea_map.json` — 대한민국 17개 시도 SVG 지도 좌표 데이터 (southkorea/southkorea-maps 리포의 GeoJSON을 단순화해서 변환)
- `app_final.html` — `app.html`의 플레이스홀더(`__INITIAL_STATE_JSON__`, `__KOREA_MAP_JSON__`)를 실제 데이터로 치환해서 만든 최종 배포본. 빌드 방법은 아래 참고.
- `test.js`, `test2.js`, `test3.js` — Playwright로 만든 스모크 테스트 (필터, 상세패널, 반응형, 다크모드 확인용)

### 빌드 방법 (app.html 수정 후 재배포 시)
```bash
python3 gen_state.py   # initial_state.json 갱신 (더미데이터 바꿀 때만)
python3 - << 'EOF'
import json
html = open('app.html', encoding='utf-8').read()
state = json.load(open('initial_state.json', encoding='utf-8'))
korea = json.load(open('korea_map.json', encoding='utf-8'))
sj = json.dumps(state, ensure_ascii=False, separators=(',',':')).replace('<', '\\u003C')
kj = json.dumps(korea, ensure_ascii=False, separators=(',',':')).replace('<', '\\u003C')
html2 = html.replace('__INITIAL_STATE_JSON__', sj).replace('__KOREA_MAP_JSON__', kj)
open('app_final.html','w',encoding='utf-8').write(html2)
EOF
```

### 현재 아키텍처의 핵심 포인트
- 페이지 안에 `<script id="state-data" type="application/json">` 태그로 상태(사고 목록, 워크플로우, 알림 로그)를 통째로 담고 있습니다.
- 뷰어가 뭔가를 바꾸면(검토완료, 메모, 알림 전송 클릭 등) `claude.use("artifact")` 캡슐화된 함수로 **페이지 전체를 다시 발행(publish)**해서 모든 뷰어에게 상태를 동기화합니다. (`artifact-capabilities` 문서 참고)
- "10분마다 새 속보"는 브라우저 탭이 열려 있을 때만 동작하는 클라이언트 타이머입니다. **진짜 백엔드가 없어서** 아무도 안 보고 있으면 갱신되지 않습니다.

## 이메일 자동 알림 (구현 완료 — GitHub Actions + Resend)
사용자가 원하는 것: 삼성화재 연관 사고가 새로 잡히면 **사람이 버튼을 누르지 않아도** `sroendg3864@gmail.com`으로 자동 이메일 발송.

결정된 방향:
1. **발송 수단**: [Resend](https://resend.com) API (Gmail 커넥터는 초안 생성까지만 지원해서 배제, SendGrid 대비 무료 티어/API 단순성 때문에 Resend 선택).
2. **감시 주기**: Cowork 스케줄 작업은 최소 간격이 보통 1시간이라 "10분 간격" 요구사항과 안 맞아서, **GitHub Actions 스케줄러**(`cron: "*/10 * * * *"`)로 처리 — Claude Code(이 리포)에서 진짜 10분 간격 실행이 가능.

### 구현 내용
- `scripts/monitor.js` — GitHub Actions에서 10분마다 실행되는 Node 스크립트.
  - `state.json`을 읽어서 새 속보 1건을 시뮬레이션(현재는 더미 — 나중에 실제 뉴스 API로 교체 가능한 지점: `generateNewIncident()`)하고, 삼성화재 계약 매칭 로직을 실행한 뒤(`maybeBuildContract()`), 매칭되면 **즉시** Resend API로 `sroendg3864@gmail.com`에 알림 이메일을 보낸다.
  - `RESEND_API_KEY` 환경변수(= GitHub Secret)가 없으면 발송을 건너뛰고 경고만 남긴다 (초기 설정 전에도 워크플로우가 깨지지 않도록).
  - 발송에 성공하면 해당 사고의 `workflow.alertSent`/`workflow.alertLog`에 자동 발송 기록을 남긴다.
  - 결과를 `state.json`에 다시 저장한다.
- `.github/workflows/incident-monitor.yml` — 10분 간격 cron + `workflow_dispatch`(수동 실행)로 위 스크립트를 실행하고, `state.json` 변경분을 같은 브랜치에 자동 커밋한다.
- `state.json` — 백엔드 전용 상태 저장소. `initial_state.json`(더미데이터 12건)으로 시드됨. **주의**: 예약 실행(`schedule:`)은 GitHub 기본 브랜치에 워크플로우 파일이 있어야 동작하므로, 이 브랜치를 머지한 뒤부터 실제로 10분마다 돌아간다.

### 설정 방법 (사용자가 해야 할 일)
1. [resend.com](https://resend.com)에서 가입하고 API 키 발급.
2. 리포 Settings → Secrets and variables → Actions에 `RESEND_API_KEY` 이름으로 등록.
3. (선택) 발신 도메인을 인증했다면 `RESEND_FROM` 시크릿/변수로 발신 주소 지정 가능 (기본값: `onboarding@resend.dev`, Resend 테스트용 발신 주소).

### 알려진 한계 / 다음 단계
- `scripts/monitor.js`가 관리하는 `state.json`은 아직 **Cowork Artifact(`app.html`)의 라이브 상태와 별개**다. GitHub Actions에서는 Artifact의 `publish()` API를 호출할 브라우저 컨텍스트가 없어서, 지금은 이메일 알림 자동화만 우선 구현했고 대시보드 동기화는 별도 작업이 필요하다 (예: 대시보드가 `state.json`을 원격에서 fetch하도록 아키텍처를 바꾸거나, 별도 동기화 스텝 추가).
- 사고/뉴스는 여전히 더미 시뮬레이션이다. 실제 뉴스 API·사내 계약관리 API 연동은 `scripts/monitor.js`의 `generateNewIncident()` / `maybeBuildContract()`를 교체하면 된다.

## 사용자 요청 원문 메모
- 손해보험협회에서 사고 관련 연락이 올 때마다 계약 담당자에게 일일이 물어보는 게 번거로워서 만든 도구.
- 10분 간격으로 사고/재해 키워드 뉴스를 모니터링하고 지도에 표시.
- 표시 항목: 발생일시, 사고제목, 인명피해, 재산피해(추정손해액, 전손/분손), 대응단계.
- 삼성화재 계약 연관 여부가 핵심 — 실제 계약 API 연동은 보안상 이 프로토타입에서는 더미데이터로 대체.
- 더미 계약 데이터 필드: 증권번호, 보험기간, 삼성화재 보유여부/비율, 보험금액, LOL, 계약자, 보험상품, 가입사항(건물당/인당/사고당), 공동인수 시 회사별 비율.
- 추가로 채택된 기능: 담당자 자동 알림/워크플로우, 사고유형·업종 분류/필터, 대응단계 타임라인.
- 지금 요청: 이메일 자동 발송 기능을 Claude Code에서 이어서 만들고 싶어함.
