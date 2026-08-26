/**
 * 지역별 실제 지도 데이터 레지스트리 — scripts/build-basemaps.mjs 가 생성합니다. 직접 수정하지 마세요.
 *
 * 서버에서만 import 합니다. 20개 전체가 클라이언트 번들에 실리지 않도록
 * 필요한 지역 하나만 props로 내려보냅니다.
 */
import type { Basemap } from '../basemap';

import a1 from './a1.json';
import a2 from './a2.json';
import a3 from './a3.json';
import a4 from './a4.json';
import a5 from './a5.json';
import b1 from './b1.json';
import b2 from './b2.json';
import b3 from './b3.json';
import b4 from './b4.json';
import b5 from './b5.json';
import c1 from './c1.json';
import c2 from './c2.json';
import c3 from './c3.json';
import c4 from './c4.json';
import c5 from './c5.json';
import d1 from './d1.json';
import d2 from './d2.json';
import d3 from './d3.json';
import d4 from './d4.json';
import d5 from './d5.json';

const BASEMAPS: Record<string, unknown> = { a1, a2, a3, a4, a5, b1, b2, b3, b4, b5, c1, c2, c3, c4, c5, d1, d2, d3, d4, d5 };

export const getBasemap = (areaId: string): Basemap | null =>
  (BASEMAPS[areaId] as Basemap | undefined) ?? null;

export const BASEMAP_AREA_IDS = ['a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'b5', 'c1', 'c2', 'c3', 'c4', 'c5', 'd1', 'd2', 'd3', 'd4', 'd5'];
