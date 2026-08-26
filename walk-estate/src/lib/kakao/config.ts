/**
 * 카카오 연동 설정.
 *
 * 키가 없으면 앱은 그대로 동작합니다 — 지도는 시뮬레이션 캔버스로,
 * 체크포인트는 지역 이름 기반 생성기로 자동 폴백됩니다.
 */

/** 브라우저에서 지도를 그릴 때 쓰는 JavaScript 키 (노출되는 값) */
export const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? '';

/** 서버에서만 쓰는 REST API 키 — 장소 검색/좌표 변환용 */
export const KAKAO_REST_KEY = process.env.KAKAO_REST_API_KEY ?? '';

/** Tmap 보행자 경로안내 키 (선택) */
export const TMAP_APP_KEY = process.env.TMAP_APP_KEY ?? '';

export const isKakaoMapEnabled = () => KAKAO_JS_KEY.length > 0;
export const isKakaoLocalEnabled = () => KAKAO_REST_KEY.length > 0;
export const isTmapEnabled = () => TMAP_APP_KEY.length > 0;
