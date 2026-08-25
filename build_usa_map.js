// us-atlas TopoJSON -> korea_map.json과 같은 스키마의 usa_map.json
// 알래스카/하와이/푸에르토리코는 제외한다 (본토 48주 + DC).
// equirectangular 투영이라 알래스카를 넣으면 경도 범위가 -179까지 벌어져 본토가 뭉개진다.
const fs = require('fs');
const path = require('path');
const topojson = require(path.join(__dirname, 'node_modules/topojson-client'));

const topo = JSON.parse(fs.readFileSync(path.join(__dirname, 'node_modules/us-atlas/states-10m.json'), 'utf8'));
const geo = topojson.feature(topo, topo.objects.states);

const EXCLUDE = new Set(['Alaska', 'Hawaii', 'Puerto Rico', 'United States Virgin Islands',
  'Guam', 'American Samoa', 'Commonwealth of the Northern Mariana Islands']);

const feats = geo.features.filter(f => !EXCLUDE.has(f.properties.name));
console.log('states kept:', feats.length);

// ---- 1) 링 단순화 ----------------------------------------------------------
// Douglas-Peucker. 섬이 많은 주(플로리다·메인 등)에서 점 수를 크게 줄인다.
function perpDist(p, a, b) {
  const [x, y] = p, [x1, y1] = a, [x2, y2] = b;
  const dx = x2 - x1, dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return Math.hypot(x - cx, y - cy);
}
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  let maxD = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= tol) return [pts[0], pts[pts.length - 1]];
  return simplify(pts.slice(0, idx + 1), tol).slice(0, -1).concat(simplify(pts.slice(idx), tol));
}
function ringArea(pts) {
  let a = 0;
  for (let i = 0, n = pts.length; i < n; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % n];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2);
}

const TOL = 0.045;        // 도 단위
const MIN_AREA = 0.06;    // 이보다 작은 섬은 버린다

function ringsOf(f) {
  const g = f.geometry;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  const out = [];
  polys.forEach(poly => {
    const outer = poly[0];                       // 구멍(내부 링)은 무시
    if (ringArea(outer) < MIN_AREA) return;
    let s = simplify(outer.map(c => [c[0], c[1]]), TOL);
    if (s.length >= 4) out.push(s);
  });
  return out;
}

const stateRings = feats.map(f => ({ name: f.properties.name, id: f.id, rings: ringsOf(f) }))
  .filter(s => s.rings.length);

// ---- 2) 투영 --------------------------------------------------------------
let minlon = 180, maxlon = -180, minlat = 90, maxlat = -90;
stateRings.forEach(s => s.rings.forEach(r => r.forEach(([lon, lat]) => {
  if (lon < minlon) minlon = lon; if (lon > maxlon) maxlon = lon;
  if (lat < minlat) minlat = lat; if (lat > maxlat) maxlat = lat;
})));

const lat0 = (minlat + maxlat) / 2;
const cosf = Math.cos(lat0 * Math.PI / 180);
const PAD = 10;
const W = 900, H = 560;                       // 본토는 가로로 넓다
const spanX = (maxlon - minlon) * cosf;
const spanY = (maxlat - minlat);
const scale = Math.min((W - PAD * 2) / spanX, (H - PAD * 2) / spanY);
const offx = PAD + ((W - PAD * 2) - spanX * scale) / 2;
const offy = PAD + ((H - PAD * 2) - spanY * scale) / 2;

const project = (lat, lon) => [
  (lon - minlon) * cosf * scale + offx,
  (maxlat - lat) * scale + offy,
];

// ---- 3) path 문자열 --------------------------------------------------------
const provinces = stateRings.map(s => {
  const d = s.rings.map(r => {
    const pts = r.map(([lon, lat]) => {
      const [x, y] = project(lat, lon);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return 'M' + pts[0] + ' L' + pts.slice(1).join(' L') + ' Z';
  }).join(' ');
  return { name: s.name, code: String(s.id), d };
});

const out = {
  viewBox: `0 0 ${W} ${H}`,
  provinces,
  proj: { minlon, maxlon, minlat, maxlat, lat0, cosf, scale, offx, offy, W, H },
};

fs.writeFileSync(path.join(__dirname, 'usa_map.json'), JSON.stringify(out));
console.log('provinces:', provinces.length);
console.log('total path chars:', provinces.reduce((a, p) => a + p.d.length, 0));
console.log('bbox lon', minlon.toFixed(2), maxlon.toFixed(2), '| lat', minlat.toFixed(2), maxlat.toFixed(2));
console.log('bytes:', JSON.stringify(out).length);
