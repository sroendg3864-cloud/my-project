/**
 * 20개 지역 → 자치구 / 법정동 매핑.
 *
 * lawdCd는 행정표준코드 법정동코드의 앞 5자리(시군구)로, 국토교통부 실거래가 API의
 * LAWD_CD 파라미터에 그대로 넣는다. dong은 API 응답의 법정동 필드와 대조해
 * 동 단위로 걸러내는 데 쓴다.
 */
export interface AreaDistrict {
  areaId: string;
  district: string;
  lawdCd: string;
  /** 실거래가 응답의 법정동 값과 매칭할 이름 */
  dong: string;
}

export const AREA_DISTRICTS: AreaDistrict[] = [
  { areaId: 'a1', district: '강서구', lawdCd: '11500', dong: '화곡동' },
  { areaId: 'a2', district: '구로구', lawdCd: '11530', dong: '온수동' },
  { areaId: 'a3', district: '구로구', lawdCd: '11530', dong: '오류동' },
  { areaId: 'a4', district: '도봉구', lawdCd: '11320', dong: '쌍문동' },
  { areaId: 'a5', district: '중랑구', lawdCd: '11260', dong: '중화동' },
  { areaId: 'b1', district: '양천구', lawdCd: '11470', dong: '신정동' },
  { areaId: 'b2', district: '강서구', lawdCd: '11500', dong: '방화동' },
  { areaId: 'b3', district: '강북구', lawdCd: '11305', dong: '수유동' },
  { areaId: 'b4', district: '중랑구', lawdCd: '11260', dong: '상봉동' },
  { areaId: 'b5', district: '구로구', lawdCd: '11530', dong: '개봉동' },
  { areaId: 'c1', district: '관악구', lawdCd: '11620', dong: '봉천동' },
  { areaId: 'c2', district: '동작구', lawdCd: '11590', dong: '노량진동' },
  { areaId: 'c3', district: '강북구', lawdCd: '11305', dong: '미아동' },
  { areaId: 'c4', district: '강동구', lawdCd: '11740', dong: '천호동' },
  { areaId: 'c5', district: '구로구', lawdCd: '11530', dong: '구로동' },
  { areaId: 'd1', district: '마포구', lawdCd: '11440', dong: '상수동' },
  { areaId: 'd2', district: '마포구', lawdCd: '11440', dong: '망원동' },
  { areaId: 'd3', district: '은평구', lawdCd: '11380', dong: '갈현동' },
  { areaId: 'd4', district: '영등포구', lawdCd: '11560', dong: '신길동' },
  { areaId: 'd5', district: '강동구', lawdCd: '11740', dong: '성내동' },
];

export const districtOf = (areaId: string): AreaDistrict | undefined =>
  AREA_DISTRICTS.find((entry) => entry.areaId === areaId);
