/**
 * demo/index.html 안에 실제 지도 데이터(src/data/basemaps/*.json)를 심는다.
 *
 *   node scripts/inject-basemaps.mjs
 *
 * 단일 HTML 데모는 외부 요청 없이 동작해야 하므로, 지도 데이터를 파일 안에 그대로 넣는다.
 * 지도 데이터: © OpenStreetMap contributors (ODbL)
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEMO = resolve(ROOT, 'demo/index.html');
const DIR = resolve(ROOT, 'src/data/basemaps');

const START = '/* BASEMAPS:START */';
const END = '/* BASEMAPS:END */';

const files = readdirSync(DIR).filter((name) => name.endsWith('.json'));
const basemaps = {};
for (const file of files) {
  basemaps[file.replace('.json', '')] = JSON.parse(readFileSync(resolve(DIR, file), 'utf8'));
}

const html = readFileSync(DEMO, 'utf8');
const start = html.indexOf(START);
const end = html.indexOf(END);
if (start === -1 || end === -1) throw new Error('demo/index.html에서 BASEMAPS 자리표시자를 찾지 못했습니다.');

const payload = JSON.stringify(basemaps);
const next = html.slice(0, start + START.length) + payload + html.slice(end);
writeFileSync(DEMO, next);

const kb = (payload.length / 1024).toFixed(0);
console.log(`✓ ${Object.keys(basemaps).length}개 지역 지도 데이터 주입 · ${kb}KB`);
