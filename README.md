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

## 담당자 알림 현황 패널 (지도 옆)
지도 아래(맵 패널 안, 레전드와 필터 사이)에 **담당자 알림 현황** 패널이 있습니다.
삼성화재 계약 연관 사고에 대해 담당 언더라이터에게 알림이 나가는 상태만 한눈에 보여주는 표시용 패널입니다.

- 구현 위치: `app.html`의 `renderAlertPanel()` — `render()`에서 매번 호출되므로 신규 속보가 들어오면 자동 갱신됩니다.
- 표시 내용: 사고 제목 / 담당 언더라이터 이름·이메일 / 발송 시각 또는 "발송 대기 중" / `발송됨`·`대기` 배지.
- 정렬: **대기 건이 위로**, 그다음 최신 발생순.
- 헤더에 `발송 N · 대기 M` 카운트가 표시되고, 행을 클릭하면 해당 사고의 상세 패널이 열립니다.
- 더미 알림 데이터는 `gen_state.py`의 `alert_log()` 헬퍼로 넣습니다. 현재 매칭 8건 중 5건이 발송됨, 3건이 대기 상태입니다.

**주의**: 이 패널은 알림 상태를 **표시만** 합니다. 실제 메일/문자가 나가지는 않습니다 (기존 상세 패널의 "담당자에게 알림 전송" 버튼도 동일하게 시뮬레이션입니다).

### 검토했다가 뺀 것: 이메일 자동 발송
Resend API + GitHub Actions(10분 cron)로 실제 자동 메일 발송까지 구현했다가, 프로토타입 단계에 과하다고 판단해서 걷어냈습니다.
나중에 다시 필요해지면 참고할 내용:
- **발송 수단**: Resend/SendGrid 같은 발송 전용 API (Gmail 커넥터는 초안 생성까지만 지원해서 배제).
- **감시 주기**: Cowork 스케줄 작업은 최소 간격이 보통 1시간이라 "10분 간격"과 안 맞음 → GitHub Actions `cron: "*/10 * * * *"`이면 실제 10분 간격 실행 가능.
- API 키는 **절대 코드에 하드코딩하지 말고** GitHub Secrets 등 시크릿으로 관리할 것.
- 걷어낸 구현은 git 히스토리(`Add automatic email alert workflow` 커밋)에 남아 있습니다.

## 사용자 요청 원문 메모
- 손해보험협회에서 사고 관련 연락이 올 때마다 계약 담당자에게 일일이 물어보는 게 번거로워서 만든 도구.
- 10분 간격으로 사고/재해 키워드 뉴스를 모니터링하고 지도에 표시.
- 표시 항목: 발생일시, 사고제목, 인명피해, 재산피해(추정손해액, 전손/분손), 대응단계.
- 삼성화재 계약 연관 여부가 핵심 — 실제 계약 API 연동은 보안상 이 프로토타입에서는 더미데이터로 대체.
- 더미 계약 데이터 필드: 증권번호, 보험기간, 삼성화재 보유여부/비율, 보험금액, LOL, 계약자, 보험상품, 가입사항(건물당/인당/사고당), 공동인수 시 회사별 비율.
- 추가로 채택된 기능: 담당자 자동 알림/워크플로우, 사고유형·업종 분류/필터, 대응단계 타임라인.
- 이메일 자동 발송은 프로토타입 단계에 과하다고 판단해서 제외 — 대신 지도 옆에 알림 현황 표시 패널만 더미데이터로 추가함.
