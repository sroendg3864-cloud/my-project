/**
 * 카카오 Local REST API 래퍼 (서버 전용).
 *
 * - 키워드로 장소 검색:   https://dapi.kakao.com/v2/local/search/keyword.json
 * - 카테고리로 장소 검색: https://dapi.kakao.com/v2/local/search/category.json
 * 인증 헤더: `Authorization: KakaoAK ${REST_API_KEY}`
 *
 * REST 키는 절대 클라이언트로 나가면 안 되므로 이 모듈은 서버 컴포넌트/route handler에서만 import 합니다.
 */
import 'server-only';
import { KAKAO_REST_KEY } from './config';

/** 기본은 카카오 운영 서버. KAKAO_LOCAL_BASE는 목 서버로 통합 테스트할 때만 쓴다. */
const BASE = process.env.KAKAO_LOCAL_BASE ?? 'https://dapi.kakao.com/v2/local';

/** 카카오가 쓰는 카테고리 그룹 코드 중 이 서비스에서 쓰는 것들 */
export const CATEGORY_GROUP = {
  MART: 'MT1',        // 대형마트
  CONVENIENCE: 'CS2', // 편의점
  SCHOOL: 'SC4',      // 학교
  ACADEMY: 'AC5',     // 학원
  SUBWAY: 'SW8',      // 지하철역
  CULTURE: 'CT1',     // 문화시설
  PUBLIC: 'PO3',      // 공공기관
  HOSPITAL: 'HP8',    // 병원
} as const;

export interface KakaoPlace {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  road_address_name: string;
  address_name: string;
  x: string; // 경도(lng)
  y: string; // 위도(lat)
  distance?: string;
}

interface KakaoSearchResponse {
  documents: KakaoPlace[];
  meta: { total_count: number; is_end: boolean };
}

/** 하루 단위 캐시 — POI는 자주 바뀌지 않고, 호출 쿼터도 아껴야 한다. */
const REVALIDATE_SECONDS = 60 * 60 * 24;

async function callLocal(path: string, params: Record<string, string | number | undefined>): Promise<KakaoPlace[]> {
  if (!KAKAO_REST_KEY) return [];

  const url = new URL(BASE + path);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  });

  try {
    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) {
      console.warn(`[kakao] ${path} ${response.status} — 폴백으로 진행합니다.`);
      return [];
    }
    const data = (await response.json()) as KakaoSearchResponse;
    return data.documents ?? [];
  } catch (error) {
    console.warn('[kakao] 요청 실패 — 폴백으로 진행합니다.', error);
    return [];
  }
}

/** 키워드로 장소 검색 (예: '노량진역', '노량진 지구대') */
export const searchKeyword = (
  query: string,
  options: { x?: number; y?: number; radius?: number; size?: number } = {}
) =>
  callLocal('/search/keyword.json', {
    query,
    x: options.x,
    y: options.y,
    radius: options.radius,
    size: options.size ?? 5,
    sort: options.x !== undefined ? 'distance' : undefined,
  });

/** 카테고리 그룹 코드로 반경 내 장소 검색 */
export const searchCategory = (
  categoryGroupCode: string,
  center: { x: number; y: number },
  options: { radius?: number; size?: number } = {}
) =>
  callLocal('/search/category.json', {
    category_group_code: categoryGroupCode,
    x: center.x,
    y: center.y,
    radius: options.radius ?? 1000,
    size: options.size ?? 5,
    sort: 'distance',
  });
