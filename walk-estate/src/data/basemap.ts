/**
 * OpenStreetMap에서 받아 온 실제 지도 데이터.
 *
 * scripts/build-basemaps.mjs 가 생성하며, 좌표계는 bbox 남서쪽을 원점으로 한 미터 평면이다.
 * (x = 동쪽으로 m, y = 남쪽으로 m — 화면 좌표와 방향이 같다)
 *
 * 데이터: © OpenStreetMap contributors, ODbL
 */
export interface BasemapFeature {
  /** classes 배열의 인덱스 */
  c: number;
  /** 닫힌 도형(면)이면 1 */
  a: number;
  /** [x0, y0, x1, y1, ...] 미터 좌표 */
  p: number[];
}

export interface BasemapPoi {
  k: 'police' | 'school' | 'library' | 'supermarket' | 'park' | 'station';
  n: string;
  lat: number;
  lng: number;
}

export interface Basemap {
  areaId: string;
  regionName: string;
  stationName: string;
  center: { lat: number; lng: number };
  /** [minLat, minLng, maxLat, maxLng] */
  bbox: [number, number, number, number];
  width: number;
  height: number;
  classes: string[];
  attribution: string;
  fetchedAt: string;
  features: BasemapFeature[];
  pois: BasemapPoi[];
  /** 이름 있는 생활도로의 중간 지점 — 안전 체크포인트를 실제 길 위에 놓는 데 쓴다 */
  streets: Array<{ n: string; lat: number; lng: number }>;
}

const METRES_PER_DEGREE_LAT = 111320;

/** 위경도를 basemap의 미터 평면 좌표로 변환 */
export function projectToMetres(basemap: Basemap, lat: number, lng: number): { x: number; y: number } {
  const metresPerDegreeLng = METRES_PER_DEGREE_LAT * Math.cos((basemap.bbox[0] * Math.PI) / 180);
  return {
    x: (lng - basemap.bbox[1]) * metresPerDegreeLng,
    y: (basemap.bbox[2] - lat) * METRES_PER_DEGREE_LAT,
  };
}

/** 지도에 실제로 그려지는지 여부 — 상자 밖 지점은 경로가 튀어 보이므로 걸러낸다 */
export function isInsideBasemap(basemap: Basemap, lat: number, lng: number): boolean {
  const [minLat, minLng, maxLat, maxLng] = basemap.bbox;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}
