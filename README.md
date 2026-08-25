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

## 다음 단계로 하려던 것: 이메일 자동 알림
사용자가 원하는 것: 삼성화재 연관 사고가 새로 잡히면 **사람이 버튼을 누르지 않아도** `sroendg3864@gmail.com`으로 자동 이메일 발송.

논의된 방향:
1. **발송 수단**: Resend/SendGrid 같은 이메일 발송 전용 API 서비스에 가입해서 API 키를 받는 방식으로 결정함 (Gmail 커넥터는 초안 생성까지만 지원하고 실제 발송은 사람이 눌러야 할 수 있어서 배제).
2. **감시 주기**: 아직 미확정. Cowork의 스케줄 작업(scheduled task)은 보통 최소 간격이 1시간이라 "10분 간격" 요구사항과 안 맞을 수 있음 — Claude Code 쪽에서 사용자 본인 서버/크론(예: GitHub Actions 스케줄, 자체 서버 cron, Vercel Cron 등)으로 처리하면 진짜 10분 간격도 가능함. 이 부분을 사용자와 다시 상의해서 정해야 함.

### 구현 아이디어 (참고용, 아직 미구현)
1. 정적 페이지 대신 작은 백엔드(Node/Python)를 두거나, GitHub Actions 같은 스케줄러가 주기적으로:
   - (지금은 더미 데이터라) 새 속보를 시뮬레이션하거나, 나중에는 실제 뉴스 API를 조회
   - 삼성화재 계약 매칭 로직 실행 (지금은 더미 계약 DB, 나중에는 사내 계약관리 API)
   - 새로 매칭된 미검토 건이 있으면 Resend/SendGrid API로 `sroendg3864@gmail.com`에 이메일 발송
   - 상태를 어딘가에 저장 (지금 프로토타입처럼 Artifact publish를 계속 쓸지, 아니면 진짜 DB로 옮길지 결정 필요)
2. 이메일 서비스 가입 후 발급받는 API 키는 **절대 코드에 하드코딩하지 말고** 환경변수/시크릿으로 관리해야 합니다.

## 사용자 요청 원문 메모
- 손해보험협회에서 사고 관련 연락이 올 때마다 계약 담당자에게 일일이 물어보는 게 번거로워서 만든 도구.
- 10분 간격으로 사고/재해 키워드 뉴스를 모니터링하고 지도에 표시.
- 표시 항목: 발생일시, 사고제목, 인명피해, 재산피해(추정손해액, 전손/분손), 대응단계.
- 삼성화재 계약 연관 여부가 핵심 — 실제 계약 API 연동은 보안상 이 프로토타입에서는 더미데이터로 대체.
- 더미 계약 데이터 필드: 증권번호, 보험기간, 삼성화재 보유여부/비율, 보험금액, LOL, 계약자, 보험상품, 가입사항(건물당/인당/사고당), 공동인수 시 회사별 비율.
- 추가로 채택된 기능: 담당자 자동 알림/워크플로우, 사고유형·업종 분류/필터, 대응단계 타임라인.
- 지금 요청: 이메일 자동 발송 기능을 Claude Code에서 이어서 만들고 싶어함.
