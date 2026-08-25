#!/usr/bin/env node
// 10분마다 GitHub Actions에서 실행되는 인시던트 모니터.
// state.json에 신규 속보를 누적하고, 삼성화재 연관 사고가 잡히면
// 사람 개입 없이 Resend API로 sroendg3864@gmail.com에 이메일을 보낸다.
//
// 지금은 gen_state.py / app.html의 더미데이터 로직을 그대로 옮겨 "속보 시뮬레이션"만
// 하고 있다. 실제 뉴스 API 연동은 이 스크립트의 generateNewIncident()만 교체하면 된다.

const fs = require("fs");
const path = require("path");

const STATE_PATH = path.join(__dirname, "..", "state.json");
const ALERT_EMAIL_TO = "sroendg3864@gmail.com";
const DASHBOARD_URL = "https://claude.ai/code/artifact/2c98808f-01ec-4ec7-a113-9476b844e8fa";

const SCENARIO_POOL = [
  { title: "부산 감천항 냉동물류창고 화재", type: "화재", industry: "물류창고", region: "부산광역시", address: "부산광역시 사하구 감천항 물류단지", lat: 35.0968, lng: 129.0068, entity: "㈜감천콜드체인", biz: "605-81-2XXXX" },
  { title: "수원 산업단지 정밀화학 공장 폭발", type: "폭발", industry: "화학공장", region: "경기도", address: "경기도 수원시 권선구 산업단지", lat: 37.2636, lng: 127.0286, entity: "㈜수원케미", biz: "135-81-6XXXX" },
  { title: "춘천 신축 아파트 건설현장 붕괴", type: "붕괴", industry: "건설현장", region: "강원특별자치도", address: "강원특별자치도 춘천시 신축공사장", lat: 37.8813, lng: 127.7298, entity: "㈜소양건설", biz: "229-81-4XXXX" },
  { title: "김해 농산물 물류센터 화재", type: "화재", industry: "물류창고", region: "경상남도", address: "경상남도 김해시 물류단지", lat: 35.2285, lng: 128.8894, entity: "㈜김해프레시로지스", biz: "614-81-8XXXX" },
  { title: "천안 자동차부품 공장 화재", type: "화재", industry: "제조공장", region: "충청남도", address: "충청남도 천안시 산업단지", lat: 36.8151, lng: 127.1139, entity: "㈜천안오토파츠", biz: "312-81-1XXXX" },
  { title: "목포 수산물 시장 화재", type: "화재", industry: "상업시설", region: "전라남도", address: "전라남도 목포시 수산시장", lat: 34.8118, lng: 126.3922, entity: "목포수산시장상인회", biz: "-" },
];

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

function buildStageHistoryForNew(type, baseDate) {
  const seqByType = {
    "화재": ["신고접수", "소방출동", "진압중", "진화완료"],
    "폭발": ["신고접수", "소방·화학구조대출동", "진압/수습", "주민대피"],
    "붕괴": ["신고접수", "구조대출동", "구조/수습", "현장통제"],
    "수재": ["침수신고", "배수작업", "응급복구", "피해조사"],
    "교통사고": ["신고접수", "구급대출동", "구조/이송", "현장정리"],
  };
  const seq = seqByType[type] || ["신고접수", "소방출동", "진화완료"];
  const offsets = [0, randInt(3, 8), randInt(20, 45), randInt(60, 140)];
  return seq.map((stage, i) => {
    const t = new Date(baseDate.getTime() + (offsets[i] || 0) * 60000);
    return { stage, at: t.toISOString().slice(0, 19) };
  });
}

function maybeBuildContract(scn) {
  if (Math.random() < 0.4) return { matched: false, confidence: "낮음", contracts: [] };
  const held = randInt(20, 70);
  const sumInsured = randInt(20, 300) * 100000000 * 10;
  const seq = String(1000 + randInt(0, 8999));
  const products = ["재산종합보험(패키지)", "화재보험", "기업종합위험보험", "건설공사보험(CAR)"];
  const companies = ["DB손해보험", "현대해상", "KB손해보험", "메리츠화재", "한화손해보험", "롯데손해보험"];
  const partner = pick(companies);
  return {
    matched: true, confidence: pick(["높음", "중간"]),
    contracts: [{
      policyNumber: `SF-2026-AU-${seq}`,
      product: pick(products),
      policyholder: scn.entity,
      policyPeriod: { start: "2026-01-01", end: "2026-12-31" },
      status: "유효",
      samsungShare: { held: true, percentOfTotalPremium: held },
      sumInsured, lol: sumInsured,
      coverage: { perBuilding: Math.random() < 0.5 ? sumInsured : null, perPerson: null, perOccurrence: sumInsured },
      coinsurance: [{ company: "삼성화재", percent: held }, { company: partner, percent: 100 - held }],
      deductible: 100000000 * randInt(1, 10),
      reinsuranceCededPercent: randInt(0, 30),
      pastLossCount: randInt(0, 3),
      underwriter: { name: pick(["김도윤 과장", "이서연 대리", "박지훈 차장", "최민석 부장", "정하은 과장"]), phone: "02-1234-56" + randInt(10, 99), email: "underwriter@dummy-samsungfire.example" },
    }],
  };
}

function generateNewIncident(state) {
  const cursor = state.scenarioCursor || 0;
  const scn = SCENARIO_POOL[cursor % SCENARIO_POOL.length];
  state.scenarioCursor = cursor + 1;
  const now = new Date();
  const id = "INC-" + now.toISOString().slice(0, 10).replace(/-/g, "") + "-AUTO" + state.nextSeq;
  state.nextSeq++;
  const history = buildStageHistoryForNew(scn.type, now);
  const match = maybeBuildContract(scn);
  const lossTypes = ["분손(추정중)", "전손 추정", "분손"];
  return {
    id, occurredAt: now.toISOString().slice(0, 19), title: scn.title, type: scn.type, industry: scn.industry,
    location: { address: scn.address, region: scn.region, lat: scn.lat, lng: scn.lng },
    casualties: { dead: Math.random() < 0.2 ? randInt(1, 2) : 0, injured: randInt(0, 9), missing: 0 },
    propertyDamage: { lossType: pick(lossTypes), estimatedLossKRW: randInt(3, 900) * 100000000, note: "현장 수습 중 — 세부 피해규모 확인 중" },
    responseStage: history[history.length - 1].stage,
    stageHistory: history,
    sourceNote: "속보 시뮬레이션 (더미)",
    relatedEntity: { name: scn.entity, bizRegNo: scn.biz },
    samsungMatch: match,
    workflow: { reviewed: false, reviewedBy: null, reviewedAt: null, assignedTo: null, notes: [], alertSent: false, alertLog: [] },
  };
}

function krw(n) {
  if (n == null) return "해당없음";
  return (n / 100000000).toLocaleString("ko-KR") + "억원";
}

function buildEmail(inc) {
  const c = inc.samsungMatch.contracts[0];
  const subject = `[인시던트 레이더] 삼성화재 연관 사고 발생 — ${inc.title}`;
  const html = `
    <h2>${inc.title}</h2>
    <p><b>발생일시</b>: ${inc.occurredAt}<br>
    <b>유형/업종</b>: ${inc.type} / ${inc.industry}<br>
    <b>위치</b>: ${inc.location.address}<br>
    <b>인명피해</b>: 사망 ${inc.casualties.dead} · 부상 ${inc.casualties.injured} · 실종 ${inc.casualties.missing}<br>
    <b>재산피해</b>: ${inc.propertyDamage.lossType} · 추정손해액 ${krw(inc.propertyDamage.estimatedLossKRW)}<br>
    <b>대응단계</b>: ${inc.responseStage}<br>
    <b>매칭 신뢰도</b>: ${inc.samsungMatch.confidence}</p>
    ${c ? `<h3>연관 계약</h3>
    <p><b>증권번호</b>: ${c.policyNumber}<br>
    <b>보험상품</b>: ${c.product}<br>
    <b>계약자</b>: ${c.policyholder}<br>
    <b>삼성화재 보유비율</b>: ${c.samsungShare.percentOfTotalPremium}%<br>
    <b>보험금액</b>: ${krw(c.sumInsured)} · <b>LOL</b>: ${krw(c.lol)}<br>
    <b>담당 언더라이터</b>: ${c.underwriter.name} (${c.underwriter.phone}, ${c.underwriter.email})</p>` : ""}
    <p><a href="${DASHBOARD_URL}">대시보드에서 확인하기</a></p>
    <p style="color:#888;font-size:12px">이 사고 정보와 계약 정보는 프로토타입 더미데이터입니다. 자동 발송 알림.</p>
  `.trim();
  return { subject, html };
}

async function sendAlertEmail(inc) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "Incident Radar <onboarding@resend.dev>";
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping actual email send for", inc.id);
    return { sent: false, reason: "no_api_key" };
  }
  const { subject, html } = buildEmail(inc);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [ALERT_EMAIL_TO], subject, html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
  return { sent: true };
}

async function main() {
  const state = fs.existsSync(STATE_PATH)
    ? JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"))
    : { lastUpdated: new Date().toISOString(), nextSeq: 1, alertsUnread: 0, incidents: [] };

  const inc = generateNewIncident(state);
  state.incidents.unshift(inc);
  state.lastUpdated = inc.occurredAt;

  console.log(`generated ${inc.id}: ${inc.title} (matched=${inc.samsungMatch.matched})`);

  if (inc.samsungMatch.matched) {
    state.alertsUnread = (state.alertsUnread || 0) + 1;
    try {
      const result = await sendAlertEmail(inc);
      if (result.sent) {
        inc.workflow.alertSent = true;
        inc.workflow.alertLog.push({
          at: new Date().toISOString().slice(0, 19),
          text: `자동 알림 이메일 발송됨 (${ALERT_EMAIL_TO})`,
        });
        console.log(`alert email sent for ${inc.id}`);
      } else {
        console.log(`alert email not sent for ${inc.id}: ${result.reason}`);
      }
    } catch (err) {
      console.error(`failed to send alert email for ${inc.id}:`, err.message);
      process.exitCode = 1;
    }
  }

  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n", "utf-8");
}

main();
