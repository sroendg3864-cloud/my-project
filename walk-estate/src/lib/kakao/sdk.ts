'use client';

/**
 * 카카오맵 JavaScript SDK 로더.
 *
 * <script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=...&autoload=false"> 를 한 번만 주입하고
 * kakao.maps.load() 콜백이 끝난 뒤에 resolve 한다.
 *
 * 주의: 카카오 개발자 콘솔의 [플랫폼 > Web > 사이트 도메인]에 등록된 도메인에서만 동작한다.
 * (개발 중이라면 http://localhost:3000 을 등록해야 한다.)
 */
import { KAKAO_JS_KEY } from './config';

export interface KakaoLatLng { getLat(): number; getLng(): number }
export interface KakaoMapInstance {
  setCenter(latlng: KakaoLatLng): void;
  panTo(latlng: KakaoLatLng): void;
  setBounds(bounds: KakaoBounds, ...padding: number[]): void;
  setLevel(level: number): void;
}
export interface KakaoBounds { extend(latlng: KakaoLatLng): void }
export interface KakaoOverlay { setMap(map: KakaoMapInstance | null): void }

export interface KakaoMaps {
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoBounds;
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number; draggable?: boolean }) => KakaoMapInstance;
  Polyline: new (options: {
    path: KakaoLatLng[]; strokeWeight: number; strokeColor: string;
    strokeOpacity: number; strokeStyle: string;
  }) => KakaoOverlay;
  CustomOverlay: new (options: {
    position: KakaoLatLng; content: string | HTMLElement; yAnchor?: number; xAnchor?: number; zIndex?: number; clickable?: boolean;
  }) => KakaoOverlay;
  load(callback: () => void): void;
}
declare global {
  interface Window { kakao?: { maps: KakaoMaps } }
}

let sdkPromise: Promise<KakaoMaps> | null = null;

export function loadKakaoSdk(): Promise<KakaoMaps> {
  if (typeof window === 'undefined') return Promise.reject(new Error('브라우저에서만 사용할 수 있습니다.'));
  if (!KAKAO_JS_KEY) return Promise.reject(new Error('NEXT_PUBLIC_KAKAO_JS_KEY가 설정되지 않았습니다.'));
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    if (window.kakao?.maps?.Map) { resolve(window.kakao.maps); return; }

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => {
      const maps = window.kakao?.maps;
      if (!maps) { reject(new Error('카카오맵 SDK를 초기화하지 못했습니다.')); return; }
      maps.load(() => resolve(maps));
    };
    script.onerror = () =>
      reject(new Error('카카오맵 SDK를 불러오지 못했습니다. 앱 키와 등록된 사이트 도메인을 확인해주세요.'));
    document.head.appendChild(script);
  });
  return sdkPromise;
}
