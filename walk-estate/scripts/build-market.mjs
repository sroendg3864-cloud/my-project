/**
 * 국토교통부 아파트 실거래가로 지역별 시세·거래량 스냅샷을 만든다.
 *
 *   DATA_GO_KR_KEY=<디코딩된 서비스키> node scripts/build-market.mjs [개월수]
 *
 * 공공데이터포털(data.go.kr)에서 아래 두 API의 활용 신청이 필요하다.
 *   - 국토교통부_아파트 매매 실거래가 자료
 *   - 국토교통부_아파트 전월세 실거래가 자료
 *
 * 결과: src/data/market.json
 *   지역별 { 매매 거래건수, 매매 가격 25~75분위, 전세 보증금 25~75분위, 중위가 }
 *   금액 단위는 만원으로 앱 전체와 맞춘다.
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const KEY = process.env.DATA_GO_KR_KEY;
const MONTHS = Number(process.argv[2] ?? 3);

if (!KEY) {
  console.error('DATA_GO_KR_KEY 환경변수가 필요합니다. (공공데이터포털에서 발급받은 일반 인증키 · Decoding)');
  process.exit(1);
}

const ENDPOINTS = {
  trade: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev',
  rent: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 최근 N개월의 YYYYMM (이번 달은 집계가 덜 되어 제외) */
function recentMonths(count) {
  const months = [];
  const now = new Date();
  for (let i = 1; i <= count; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

/** XML 응답에서 <item> 목록을 뽑는다 (JSON 옵션이 없는 서비스가 있어 XML로 통일) */
function parseItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, body]) => {
    const item = {};
    for (const [, tag, value] of body.matchAll(/<([^/>]+)>([\s\S]*?)<\/\1>/g)) {
      item[tag.trim()] = value.trim();
    }
    return item;
  });
}

async function fetchMonth(kind, lawdCd, yyyymm) {
  const url = new URL(ENDPOINTS[kind]);
  url.searchParams.set('serviceKey', KEY);
  url.searchParams.set('LAWD_CD', lawdCd);
  url.searchParams.set('DEAL_YMD', yyyymm);
  url.searchParams.set('numOfRows', '1000');
  url.searchParams.set('pageNo', '1');

  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const text = await response.text();
  if (text.includes('SERVICE_KEY_IS_NOT_REGISTERED')) throw new Error('서비스키가 등록되지 않았습니다 (활용 신청 승인 여부를 확인하세요)');
  if (!response.ok) throw new Error(`${kind} ${lawdCd} ${yyyymm}: HTTP ${response.status}`);
  return parseItems(text);
}

const toManwon = (value) => Number(String(value ?? '').replace(/[,\s]/g, '')) || 0;

function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * q;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return Math.round(sorted[low] + (sorted[high] - sorted[low]) * (position - low));
}

const { AREA_DISTRICTS } = await import(`file://${resolve(ROOT, 'src/data/districts.ts')}`)
  .catch(async () => {
    // TS 파일은 직접 import할 수 없으므로 정규식으로 읽는다
    const { readFileSync } = await import('node:fs');
    const source = readFileSync(resolve(ROOT, 'src/data/districts.ts'), 'utf8');
    const rows = [...source.matchAll(/areaId: '([^']+)', district: '([^']+)', lawdCd: '([^']+)', dong: '([^']+)'/g)];
    return { AREA_DISTRICTS: rows.map(([, areaId, district, lawdCd, dong]) => ({ areaId, district, lawdCd, dong })) };
  });

const months = recentMonths(MONTHS);
const byDistrict = new Map();

// 자치구 단위로 한 번만 받아 20개 지역이 나눠 쓴다 (같은 구를 여러 지역이 공유)
for (const lawdCd of [...new Set(AREA_DISTRICTS.map((a) => a.lawdCd))]) {
  const trades = [];
  const rents = [];
  for (const month of months) {
    trades.push(...await fetchMonth('trade', lawdCd, month));
    await sleep(400);
    rents.push(...await fetchMonth('rent', lawdCd, month));
    await sleep(400);
  }
  byDistrict.set(lawdCd, { trades, rents });
  console.log(`· ${lawdCd}  매매 ${trades.length}건 · 전월세 ${rents.length}건`);
}

const areas = {};
for (const area of AREA_DISTRICTS) {
  const { trades, rents } = byDistrict.get(area.lawdCd);
  const inDong = (item) => (item.umdNm ?? item.법정동 ?? '').includes(area.dong.replace('동', ''));

  const tradePrices = trades.filter(inDong).map((item) => toManwon(item.dealAmount ?? item.거래금액)).filter(Boolean).sort((a, b) => a - b);
  // 전월세는 월세 0원(순수 전세)만 남긴다
  const jeonsePrices = rents.filter(inDong)
    .filter((item) => toManwon(item.monthlyRent ?? item.월세금액) === 0)
    .map((item) => toManwon(item.deposit ?? item.보증금액)).filter(Boolean).sort((a, b) => a - b);

  areas[area.areaId] = {
    district: area.district,
    dong: area.dong,
    tradeCount: tradePrices.length,
    districtTradeCount: trades.length,
    buy: tradePrices.length >= 5
      ? { min: quantile(tradePrices, 0.25), max: quantile(tradePrices, 0.75), median: quantile(tradePrices, 0.5) }
      : null,
    jeonse: jeonsePrices.length >= 5
      ? { min: quantile(jeonsePrices, 0.25), max: quantile(jeonsePrices, 0.75), median: quantile(jeonsePrices, 0.5) }
      : null,
  };

  const buy = areas[area.areaId].buy;
  console.log(`${area.areaId} ${area.dong.padEnd(6)} 매매 ${String(tradePrices.length).padStart(3)}건` +
    (buy ? `  ${buy.min.toLocaleString('ko-KR')}~${buy.max.toLocaleString('ko-KR')}만` : '  (표본 부족)'));
}

writeFileSync(resolve(ROOT, 'src/data/market.json'), JSON.stringify({
  source: '국토교통부 아파트 매매/전월세 실거래가 (공공데이터포털)',
  sourceUrl: 'https://www.data.go.kr/data/15126469/openapi.do',
  months,
  unit: '만원',
  fetchedAt: new Date().toISOString().slice(0, 10),
  areas,
}, null, 2));

console.log(`\n✓ src/data/market.json 저장 — ${months.join(', ')}`);
