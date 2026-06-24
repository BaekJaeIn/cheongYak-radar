import { describe, it, expect } from "vitest";
import {
  buildQuery,
  todayKST,
  encodeCursor,
  decodeCursor,
  makeCursor,
  FAR_FUTURE,
} from "@/features/notices/query-builder";
import { defaultFilter, type NoticeFilter } from "@/lib/types/notice";

const base: NoticeFilter = {
  regions: [],
  sources: [],
  priorities: [],
  hideExpired: false,
};

describe("todayKST", () => {
  it("KST 기준 YYYY-MM-DD 형식을 반환한다", () => {
    // 2026-06-24T20:00:00Z → KST 2026-06-25
    expect(todayKST(new Date("2026-06-24T20:00:00Z"))).toBe("2026-06-25");
    // 2026-06-24T05:00:00Z → KST 2026-06-24
    expect(todayKST(new Date("2026-06-24T05:00:00Z"))).toBe("2026-06-24");
  });
});

describe("buildQuery — 필터 매핑 (BR-3)", () => {
  it("기본 정렬은 sort_apply_end asc(nullsLast), id asc 이다 (BR-4/BR-5)", () => {
    const q = buildQuery(base);
    expect(q.order).toEqual([
      { column: "sort_apply_end", ascending: true, nullsFirst: false },
      { column: "id", ascending: true, nullsFirst: false },
    ]);
  });

  it("시군구만 있으면 region_sigu IN 으로 매핑한다 (BR-3.1)", () => {
    const q = buildQuery({ ...base, regions: ["안양시", "군포시"] });
    expect(q.in).toContainEqual({ column: "region_sigu", values: ["안양시", "군포시"] });
    expect(q.regionOr).toBeUndefined();
  });

  it("시도와 시군구가 섞이면 OR 표현을 만든다", () => {
    const q = buildQuery({ ...base, regions: ["안양시", "서울"] });
    expect(q.regionOr).toBe("region_sigu.eq.안양시,region_sido.eq.서울");
  });

  it("sources/priorities를 IN으로 매핑한다 (BR-3.3/3.4)", () => {
    const q = buildQuery({ ...base, sources: ["apt", "lh"], priorities: ["1순위"] });
    expect(q.in).toContainEqual({ column: "source", values: ["apt", "lh"] });
    expect(q.in).toContainEqual({ column: "priority", values: ["1순위"] });
  });

  it("newlywed/preNewlywed는 eq true로 매핑한다 (BR-3.5)", () => {
    const q = buildQuery({ ...base, newlywed: true, preNewlywed: true });
    expect(q.eq).toContainEqual({ column: "newlywed", value: true });
    expect(q.eq).toContainEqual({ column: "pre_newlywed", value: true });
  });

  it("면적은 교집합 비교로 매핑한다 (BR-3.2)", () => {
    const q = buildQuery({ ...base, areaMin: 40, areaMax: 85 });
    expect(q.areaGte).toEqual({ column: "area_max", value: 40 });
    expect(q.areaLte).toEqual({ column: "area_min", value: 85 });
  });

  it("hideExpired면 apply_end null 또는 today 이후 OR 조건을 만든다 (BR-3.6)", () => {
    const q = buildQuery({ ...base, hideExpired: true }, undefined, "2026-06-24");
    expect(q.hideExpiredOr).toBe("apply_end.is.null,apply_end.gte.2026-06-24");
  });

  it("커서가 있으면 키셋 OR 조건을 만든다 (BR-5)", () => {
    const q = buildQuery(base, { sortApplyEnd: "2026-07-01", id: "apt:1" });
    expect(q.cursorOr).toBe(
      "sort_apply_end.gt.2026-07-01,and(sort_apply_end.eq.2026-07-01,id.gt.apt:1)",
    );
  });

  it("defaultFilter는 관심 지역 기본값과 hideExpired=true를 갖는다 (C-5)", () => {
    const f = defaultFilter();
    expect(f.hideExpired).toBe(true);
    expect(f.regions).toContain("안양시");
    expect(f.regions).toContain("군포시");
  });
});

describe("cursor 인코딩/디코딩 (BR-5)", () => {
  it("encode→decode 왕복이 동일하다", () => {
    const c = { sortApplyEnd: "2026-07-01", id: "apt:2026000123" };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });

  it("잘못된 커서는 undefined를 반환한다", () => {
    expect(decodeCursor("!!!not-base64!!!")).toBeUndefined();
  });

  it("makeCursor는 apply_end null을 FAR_FUTURE로 대체한다", () => {
    expect(makeCursor({ apply_end: null, id: "lh:1" })).toEqual({
      sortApplyEnd: FAR_FUTURE,
      id: "lh:1",
    });
  });
});
