/**
 * 서울 자치구별 인구·면적을 받아 src/data/population.json 으로 저장한다.
 *
 *   node scripts/build-population.mjs
 *
 * 출처: 위키백과 "서울특별시의 행정 구역" 표 (세대 / 인구 / 면적 km²).
 * 실서비스에서는 행정안전부 주민등록 인구통계나 KOSIS로 교체하는 것을 권장한다.
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = '서울특별시의 행정 구역';
const SOURCE_URL = `https://ko.wikipedia.org/wiki/${encodeURIComponent(PAGE)}`;

const url = new URL('https://ko.wikipedia.org/w/api.php');
url.searchParams.set('action', 'parse');
url.searchParams.set('page', PAGE);
url.searchParams.set('prop', 'wikitext');
url.searchParams.set('format', 'json');

const response = await fetch(url, { headers: { 'User-Agent': 'WalkEstate/1.0 (population snapshot)' } });
if (!response.ok) throw new Error(`위키백과 ${response.status}`);
const wikitext = (await response.json()).parse.wikitext['*'];

// | '''[[강서구 (서울특별시)|강서구]]''' \n|江西區|| 256,746 || 599,501 || 41.43
const rowPattern = /\|\s*'''\[\[(?:[^\]|]+\|)?([가-힣]+구)\]\]'''\s*\n\|[^|]*\|\|\s*([\d,]+)\s*\|\|\s*([\d,]+)\s*\|\|\s*([\d.]+)/g;

const districts = {};
for (const [, name, households, population, areaKm2] of wikitext.matchAll(rowPattern)) {
  const people = Number(population.replace(/,/g, ''));
  const area = Number(areaKm2);
  districts[name] = {
    households: Number(households.replace(/,/g, '')),
    population: people,
    areaKm2: area,
    densityPerKm2: Math.round(people / area),
  };
}

const count = Object.keys(districts).length;
if (count !== 25) throw new Error(`자치구 25개를 기대했지만 ${count}개를 찾았습니다 — 표 구조가 바뀌었는지 확인하세요.`);

const payload = {
  source: '위키백과 · 서울특별시의 행정 구역',
  sourceUrl: SOURCE_URL,
  fetchedAt: new Date().toISOString().slice(0, 10),
  unit: { population: '명', areaKm2: 'km²', densityPerKm2: '명/km²' },
  districts,
};
writeFileSync(resolve(ROOT, 'src/data/population.json'), JSON.stringify(payload, null, 2));

const dense = Object.entries(districts).sort((a, b) => b[1].densityPerKm2 - a[1].densityPerKm2);
console.log(`✓ 자치구 ${count}개 저장`);
console.log(`  가장 조밀: ${dense[0][0]} ${dense[0][1].densityPerKm2.toLocaleString('ko-KR')}명/km²`);
console.log(`  가장 여유: ${dense.at(-1)[0]} ${dense.at(-1)[1].densityPerKm2.toLocaleString('ko-KR')}명/km²`);
