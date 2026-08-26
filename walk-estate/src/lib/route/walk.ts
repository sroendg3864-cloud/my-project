/**
 * 도보 경로 계산기.
 *
 * 카카오모빌리티의 '도보 길찾기' API는 제휴 파트너 전용이라 일반 개발자 키로는 호출할 수 없다.
 * 그래서 실제 보행 경로가 필요하면 Tmap 보행자 경로안내를 쓰고, 키가 없으면
 * 하버사인 직선거리에 우회계수를 곱해 근사한다. 어느 쪽이든 결과 모양은 같다.
 */
import 'server-only';
import { TMAP_APP_KEY, isTmapEnabled } from '@/lib/kakao/config';

export interface LatLng { lat: number; lng: number }

export interface WalkLeg {
  /** 실제로 그릴 경로 좌표열 (근사 모드에서는 [시작, 끝] 두 점) */
  path: LatLng[];
  distanceMeters: number;
  /** 제공자가 알려준 소요 시간(초). 근사 모드에서는 undefined */
  durationSeconds?: number;
}

export type WalkProviderName = 'tmap-pedestrian' | 'straight-line';

/** 직선거리 → 실제 보행거리 보정 계수 (골목·횡단보도 우회분) */
export const DETOUR_FACTOR = 1.25;

const EARTH_RADIUS_M = 6371000;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

const straightLineLeg = (from: LatLng, to: LatLng): WalkLeg => ({
  path: [from, to],
  distanceMeters: Math.round(haversineMeters(from, to) * DETOUR_FACTOR),
});

interface TmapFeature {
  geometry: { type: string; coordinates: number[] | number[][] };
  properties?: { totalDistance?: number; totalTime?: number };
}

/**
 * Tmap 보행자 경로안내 — POST /tmap/routes/pedestrian?version=1
 * 응답은 GeoJSON FeatureCollection이며, Point feature의 properties에 총 거리/시간이 담긴다.
 */
async function tmapLeg(from: LatLng, to: LatLng, fromName: string, toName: string): Promise<WalkLeg | null> {
  try {
    const endpoint = (process.env.TMAP_BASE ?? 'https://apis.openapi.sk.com') + '/tmap/routes/pedestrian?version=1';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', appKey: TMAP_APP_KEY },
      body: JSON.stringify({
        startX: String(from.lng), startY: String(from.lat),
        endX: String(to.lng), endY: String(to.lat),
        startName: encodeURIComponent(fromName),
        endName: encodeURIComponent(toName),
        reqCoordType: 'WGS84GEO',
        resCoordType: 'WGS84GEO',
        searchOption: '0',
      }),
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!response.ok) {
      console.warn(`[tmap] ${response.status} — 직선거리 근사로 폴백합니다.`);
      return null;
    }

    const data = (await response.json()) as { features?: TmapFeature[] };
    const features = data.features ?? [];
    const summary = features.find((f) => typeof f.properties?.totalDistance === 'number');
    const path: LatLng[] = [];
    features.forEach((f) => {
      if (f.geometry?.type === 'LineString') {
        (f.geometry.coordinates as number[][]).forEach(([lng, lat]) => path.push({ lat, lng }));
      }
    });

    if (!summary || path.length === 0) return null;
    return {
      path,
      distanceMeters: Math.round(summary.properties!.totalDistance!),
      durationSeconds: summary.properties?.totalTime,
    };
  } catch (error) {
    console.warn('[tmap] 요청 실패 — 직선거리 근사로 폴백합니다.', error);
    return null;
  }
}

export interface WalkPathResult {
  provider: WalkProviderName;
  legs: WalkLeg[];
  totalDistanceMeters: number;
}

/**
 * 연속한 지점들을 구간(leg) 단위로 이어 도보 경로를 만든다.
 * 구간별 거리를 그대로 브리핑("다음 구간 242m")에 쓰기 때문에 쌍 단위로 계산한다.
 */
export async function resolveWalkPath(points: Array<LatLng & { name: string }>): Promise<WalkPathResult> {
  const pairs = points.slice(0, -1).map((from, index) => ({ from, to: points[index + 1] }));

  if (isTmapEnabled()) {
    const legs = await Promise.all(
      pairs.map(({ from, to }) => tmapLeg(from, to, from.name, to.name))
    );
    if (legs.every((leg) => leg !== null)) {
      const resolved = legs as WalkLeg[];
      return {
        provider: 'tmap-pedestrian',
        legs: resolved,
        totalDistanceMeters: resolved.reduce((sum, leg) => sum + leg.distanceMeters, 0),
      };
    }
    // 한 구간이라도 실패하면 경로 전체를 같은 기준으로 맞추기 위해 근사로 통일한다.
  }

  const legs = pairs.map(({ from, to }) => straightLineLeg(from, to));
  return {
    provider: 'straight-line',
    legs,
    totalDistanceMeters: legs.reduce((sum, leg) => sum + leg.distanceMeters, 0),
  };
}
