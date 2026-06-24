// NoticeFilter → Supabase 쿼리 절 변환 (순수 함수, 테스트 대상)
// 근거: business-rules.md BR-3(필터), BR-4(정렬), BR-5(커서), BR-8(KST)

import type { Cursor, NoticeFilter } from "@/lib/types/notice";

export const FAR_FUTURE = "9999-12-31"; // apply_end NULL의 정렬 대체값

/** KST(Asia/Seoul) 기준 오늘 날짜 YYYY-MM-DD (BR-8). */
export function todayKST(now: Date = new Date()): string {
  // en-CA 로케일은 YYYY-MM-DD 형식을 보장
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export interface EqCondition {
  column: string;
  value: string | number | boolean;
}
export interface InCondition {
  column: string;
  values: (string | number)[];
}

export interface BuiltQuery {
  eq: EqCondition[];
  in: InCondition[];
  /** area 범위 교집합 (BR-3.2): 존재하는 경계만 비교. */
  areaGte?: { column: "area_max"; value: number }; // area_max >= areaMin
  areaLte?: { column: "area_min"; value: number }; // area_min <= areaMax
  /** 지역: 시군구와 시도가 섞일 때 OR 표현 (PostgREST or) */
  regionOr?: string;
  /** hideExpired: apply_end is null OR apply_end >= today (PostgREST or 표현) */
  hideExpiredOr?: string;
  /** 커서 키셋 (sort_apply_end, id) > (cursor) — PostgREST or 표현 */
  cursorOr?: string;
  order: { column: string; ascending: boolean; nullsFirst: boolean }[];
}

/** 지역 목록을 시군구/시도 조건으로 분리. "서울"처럼 시도성 값은 region_sido로. */
function splitRegions(regions: string[]): { sigu: string[]; sido: string[] } {
  const SIDO_HINTS = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종"];
  const sigu: string[] = [];
  const sido: string[] = [];
  for (const r of regions) {
    if (SIDO_HINTS.includes(r)) sido.push(r);
    else sigu.push(r);
  }
  return { sigu, sido };
}

export function buildQuery(filter: NoticeFilter, cursor?: Cursor, today = todayKST()): BuiltQuery {
  const q: BuiltQuery = {
    eq: [],
    in: [],
    order: [
      { column: "sort_apply_end", ascending: true, nullsFirst: false },
      { column: "id", ascending: true, nullsFirst: false },
    ],
  };

  // BR-3.1 지역
  const { sigu, sido } = splitRegions(filter.regions ?? []);
  if (sigu.length && sido.length) {
    // 시군구 OR 시도 — PostgREST or
    const parts = [
      ...sigu.map((s) => `region_sigu.eq.${s}`),
      ...sido.map((s) => `region_sido.eq.${s}`),
    ];
    q.regionOr = parts.join(",");
  } else if (sigu.length) {
    q.in.push({ column: "region_sigu", values: sigu });
  } else if (sido.length) {
    q.in.push({ column: "region_sido", values: sido });
  }

  // BR-3.3 유형
  if (filter.sources?.length) q.in.push({ column: "source", values: filter.sources });
  // BR-3.4 순위
  if (filter.priorities?.length) q.in.push({ column: "priority", values: filter.priorities });
  // BR-3.5 신혼/예비신혼
  if (filter.newlywed) q.eq.push({ column: "newlywed", value: true });
  if (filter.preNewlywed) q.eq.push({ column: "pre_newlywed", value: true });

  // BR-3.2 면적 교집합
  if (typeof filter.areaMin === "number") q.areaGte = { column: "area_max", value: filter.areaMin };
  if (typeof filter.areaMax === "number") q.areaLte = { column: "area_min", value: filter.areaMax };

  // BR-3.6 마감 숨김
  if (filter.hideExpired) {
    q.hideExpiredOr = `apply_end.is.null,apply_end.gte.${today}`;
  }

  // BR-5 커서 키셋: (sort_apply_end > c.end) OR (= AND id > c.id)
  if (cursor) {
    q.cursorOr = `sort_apply_end.gt.${cursor.sortApplyEnd},and(sort_apply_end.eq.${cursor.sortApplyEnd},id.gt.${cursor.id})`;
  }

  return q;
}

/** 결과 마지막 행으로부터 다음 커서 생성. */
export function makeCursor(row: { sort_apply_end?: string | null; apply_end: string | null; id: string }): Cursor {
  const sortApplyEnd = row.sort_apply_end ?? row.apply_end ?? FAR_FUTURE;
  return { sortApplyEnd, id: row.id };
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c), "utf8").toString("base64url");
}

export function decodeCursor(s: string): Cursor | undefined {
  try {
    const obj = JSON.parse(Buffer.from(s, "base64url").toString("utf8"));
    if (typeof obj?.sortApplyEnd === "string" && typeof obj?.id === "string") return obj as Cursor;
  } catch {
    /* invalid cursor → undefined */
  }
  return undefined;
}
