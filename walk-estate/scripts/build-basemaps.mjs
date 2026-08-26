/**
 * OpenStreetMap에서 20개 지역의 실제 지도 데이터를 받아 src/data/basemaps/ 에 저장한다.
 *
 *   node scripts/build-basemaps.mjs            # 전체
 *   node scripts/build-basemaps.mjs c2 d1      # 특정 지역만
 *
 * - 좌표: Nominatim으로 역 이름을 지오코딩
 * - 지도: Overpass API로 도로·철도·공원·수계 지오메트리
 * - 체크포인트 후보: 파출소·초등학교·도서관·학원·마트·공원·지하철역 POI
 *
 * 결과 좌표계는 bbox 남서쪽 모서리를 원점으로 한 "미터" 평면이라 축척이 맞고,
 * 파일도 작다(지역당 30~60KB). 데이터 라이선스: © OpenStreetMap contributors (ODbL).
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'src/data/basemaps');
const UA = 'WalkEstate/1.0 (walking field-study prototype; contact via repo)';

/** 반경 약 800m 상자 */
const HALF_LAT = 0.0072;
const HALF_LNG = 0.0091;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** src/data/simulatedRoutes.ts 의 area(...) 목록에서 지역 정보를 읽는다 */
function readAreas() {
  const source = readFileSync(resolve(ROOT, 'src/data/simulatedRoutes.ts'), 'utf8');
  const matches = [...source.matchAll(/area\('([a-z0-9]+)',\s*'([^']+)',\s*'([^']+)'/g)];
  if (matches.length !== 20) throw new Error(`지역 파싱 실패: ${matches.length}개만 찾았습니다.`);
  return matches.map(([, id, regionName, stationName]) => ({ id, regionName, stationName }));
}

async function geocodeOnce(query) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('countrycodes', 'kr');
  url.searchParams.set('limit', '1');

  const response = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'ko' },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) return null; // 429 등은 다음 검색어로 넘어간다
  const [hit] = await response.json();
  return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
}

/** 검색어를 여러 형태로 바꿔가며 시도한다 (Nominatim은 어순에 예민하다) */
async function geocode(area) {
  const queries = [`서울 ${area.stationName}`, area.stationName, `서울 ${area.regionName}`, area.regionName];
  for (const query of queries) {
    try {
      const hit = await geocodeOnce(query);
      if (hit) return hit;
    } catch (error) {
      console.warn(`  · 지오코딩 재시도 (${query}): ${error.message}`);
    }
    await sleep(1500);
  }
  throw new Error(`좌표를 찾지 못했습니다: ${area.stationName}`);
}

/**
 * Overpass 호출.
 * 공식 서버를 우선 쓰고(붐빌 때만 429/5xx), 그래도 안 되면 미러로 넘어간다.
 * 미러는 종종 통째로 죽어 있어서 먼저 시도하면 오히려 실패율이 올라간다.
 */
// OVERPASS_ENDPOINT 로 다른 인스턴스를 지정할 수 있다 (공식 서버가 붐빌 때 미러 사용)
const OVERPASS_PRIMARY = process.env.OVERPASS_ENDPOINT ?? 'https://overpass-api.de/api/interpreter';
const OVERPASS_MIRRORS = [
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function overpass(query) {
  let last = '';
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const endpoint = attempt < 4 ? OVERPASS_PRIMARY : OVERPASS_MIRRORS[attempt - 4];
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'User-Agent': UA, 'Content-Type': 'text/plain' },
        body: query,
        signal: AbortSignal.timeout(180000),
      });
      if (response.ok) return response.json();
      last = `HTTP ${response.status}`;
      if (![429, 500, 502, 503, 504].includes(response.status)) {
        throw new Error(`Overpass ${response.status}: ${(await response.text()).slice(0, 200)}`);
      }
    } catch (error) {
      if (error.message?.startsWith('Overpass ')) throw error;
      last = error.message ?? 'network error';
    }
    await sleep(8000 * (attempt + 1));
  }
  throw new Error(`Overpass 재시도 실패 (${last})`);
}

/** 지도에 그릴 선/면 종류 — 렌더러의 스타일 키와 1:1로 맞춘다 */
const CLASSES = ['motorway','trunk','primary','secondary','tertiary','residential','service','pedestrian','footway','steps','rail','subway','water','park','green'];
const classOf = (tags = {}) => {
  if (tags.railway === 'subway') return 'subway';
  if (tags.railway) return 'rail';
  if (tags.natural === 'water' || tags.waterway) return 'water';
  if (tags.leisure === 'park' || tags.leisure === 'garden') return 'park';
  if (tags.landuse) return 'green';
  const highway = tags.highway;
  if (!highway) return null;
  if (highway === 'motorway_link') return 'motorway';
  if (highway === 'unclassified' || highway === 'living_street') return 'residential';
  if (highway === 'path') return 'footway';
  return CLASSES.includes(highway) ? highway : null;
};

/** 태그 → 체크포인트 레이어에서 쓸 POI 종류 */
const poiKindOf = (tags = {}) => {
  if (tags.amenity === 'police') return 'police';
  if (tags.amenity === 'library') return 'library';
  if (tags.amenity === 'school') return 'school';
  if (tags.railway === 'station') return 'station';
  if (tags.shop) return 'supermarket';
  if (tags.leisure === 'park') return 'park';
  return null;
};

function metresProjector(bbox) {
  const [minLat, minLng] = bbox;
  const latToM = 111320;
  const lngToM = 111320 * Math.cos((minLat * Math.PI) / 180);
  return (lat, lng) => [
    Math.round((lng - minLng) * lngToM),
    Math.round((bbox[2] - lat) * latToM), // y는 화면 좌표라 북쪽이 0
  ];
}

/** 같은 점이 반복되거나 1m도 안 움직이는 점은 버려 파일을 줄인다 */
function simplify(points) {
  const out = [];
  for (const point of points) {
    const last = out[out.length - 1];
    if (!last || Math.abs(last[0] - point[0]) > 1 || Math.abs(last[1] - point[1]) > 1) out.push(point);
  }
  return out;
}

const centroid = (geometry) => {
  const sum = geometry.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lon }), { lat: 0, lng: 0 });
  return { lat: sum.lat / geometry.length, lng: sum.lng / geometry.length };
};

async function buildArea(area) {
  const center = await geocode(area);
  const bbox = [center.lat - HALF_LAT, center.lng - HALF_LNG, center.lat + HALF_LAT, center.lng + HALF_LNG];
  const box = bbox.join(',');
  const project = metresProjector(bbox);

  // 지도 도형과 POI를 한 번에 받는다 (Overpass 슬롯을 아끼기 위해)
  const query = `[out:json][timeout:120];
(
way["highway"~"^(motorway|motorway_link|trunk|primary|secondary|tertiary|residential|unclassified|living_street|pedestrian|footway|path|steps|service)$"](${box});
way["waterway"~"^(river|stream|canal)$"](${box});
way["natural"="water"](${box});
way["leisure"~"^(park|garden)$"](${box});
way["landuse"~"^(grass|forest|recreation_ground|cemetery)$"](${box});
way["railway"~"^(subway|rail)$"](${box});
node["amenity"~"^(police|school|library)$"](${box});
way["amenity"~"^(police|school|library)$"](${box});
node["shop"~"^(supermarket|mall|department_store)$"](${box});
way["shop"~"^(supermarket|mall|department_store)$"](${box});
node["railway"="station"]["name"](${box});
);
out geom;`;

  const osm = await overpass(query);

  const features = [];
  const seen = new Set();
  const pois = [];
  const streets = [];
  const streetNames = new Set();

  for (const element of osm.elements) {
    const tags = element.tags ?? {};

    // 1) 지도에 그릴 도형
    const klass = classOf(tags);
    if (klass && element.geometry) {
      const points = simplify(element.geometry.map((p) => project(p.lat, p.lon)));
      if (points.length >= 2) {
        const closed = element.geometry.length > 3
          && element.geometry[0].lat === element.geometry.at(-1).lat
          && element.geometry[0].lon === element.geometry.at(-1).lon;
        features.push({ c: CLASSES.indexOf(klass), a: closed ? 1 : 0, p: points.flat() });
      }
    }

    // 2) 이름 있는 생활도로 — 안전 체크포인트를 실제 길 위에 놓는 데 쓴다
    if (tags.name && element.geometry
      && ['residential', 'tertiary', 'secondary', 'living_street', 'pedestrian'].includes(tags.highway)
      && !streetNames.has(tags.name)) {
      const mid = element.geometry[Math.floor(element.geometry.length / 2)];
      streetNames.add(tags.name);
      streets.push({ n: tags.name, lat: Number(mid.lat.toFixed(6)), lng: Number(mid.lon.toFixed(6)) });
    }

    // 3) 체크포인트 후보 POI
    const kind = poiKindOf(tags);
    const name = tags.name;
    if (!kind || !name || seen.has(name)) continue;

    const point = element.type === 'node'
      ? { lat: element.lat, lng: element.lon }
      : element.geometry ? centroid(element.geometry) : null;
    if (!point) continue;

    seen.add(name);
    pois.push({ k: kind, n: name, lat: Number(point.lat.toFixed(6)), lng: Number(point.lng.toFixed(6)) });
  }

  const width = Math.round((bbox[3] - bbox[1]) * 111320 * Math.cos((bbox[0] * Math.PI) / 180));
  const height = Math.round((bbox[2] - bbox[0]) * 111320);

  return {
    areaId: area.id, regionName: area.regionName, stationName: area.stationName,
    center, bbox, width, height, classes: CLASSES,
    attribution: '© OpenStreetMap contributors',
    fetchedAt: new Date().toISOString().slice(0, 10),
    features, pois, streets,
  };
}

const args = process.argv.slice(2);
const registryOnly = args.includes('--registry');
const wanted = args.filter((arg) => !arg.startsWith('--'));
const areas = registryOnly ? [] : readAreas().filter((a) => !wanted.length || wanted.includes(a.id));
mkdirSync(OUT_DIR, { recursive: true });

for (const area of areas) {
  process.stdout.write(`… ${area.id} ${area.regionName}\n`);
  try {
    const data = await buildArea(area);
    const file = resolve(OUT_DIR, `${area.id}.json`);
    writeFileSync(file, JSON.stringify(data));
    const kb = (JSON.stringify(data).length / 1024).toFixed(0);
    console.log(`✓ ${area.id} ${area.regionName}  도형 ${data.features.length} · POI ${data.pois.length} · 도로명 ${data.streets.length} · ${kb}KB`);
  } catch (error) {
    console.error(`✗ ${area.id} ${area.regionName}: ${error.message}`);
  }
  await sleep(12000); // Nominatim/Overpass 사용 정책 준수 (슬롯 회복 대기)
}

writeRegistry();

/** 실제로 만들어진 지역만 담은 레지스트리를 생성한다 */
function writeRegistry() {
  const ids = readAreas()
    .map((a) => a.id)
    .filter((id) => existsSync(resolve(OUT_DIR, `${id}.json`)));

  const body = `/**
 * 지역별 실제 지도 데이터 레지스트리 — scripts/build-basemaps.mjs 가 생성합니다. 직접 수정하지 마세요.
 *
 * 서버에서만 import 합니다. 20개 전체가 클라이언트 번들에 실리지 않도록
 * 필요한 지역 하나만 props로 내려보냅니다.
 */
import type { Basemap } from '../basemap';

${ids.map((id) => `import ${id} from './${id}.json';`).join('\n')}

const BASEMAPS: Record<string, unknown> = { ${ids.join(', ')} };

export const getBasemap = (areaId: string): Basemap | null =>
  (BASEMAPS[areaId] as Basemap | undefined) ?? null;

export const BASEMAP_AREA_IDS = [${ids.map((id) => `'${id}'`).join(', ')}];
`;
  writeFileSync(resolve(OUT_DIR, 'index.ts'), body);
  console.log(`\n레지스트리 생성: ${ids.length}개 지역`);
}
