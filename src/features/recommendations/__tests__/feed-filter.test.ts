import { describe, it, expect } from "vitest";
import {
  fromSearchParams,
  toSearchParams,
  kindToSources,
  matchesKind,
  passesFilter,
  defaultFeedFilter,
} from "@/features/recommendations/feed-filter";
import type { Notice } from "@/lib/types/notice";

function notice(over: Partial<Notice>): Notice {
  return {
    id: "apt:1", source_no: "1", source: "apt", title: "공고",
    region_sido: "경기", region_sigu: "안양시", area_min: 55, area_max: 59,
    notice_date: null, apply_start: null, apply_end: "2026-12-31", winner_date: null,
    supply_type: null, newlywed: false, pre_newlywed: false, priority: "1순위",
    url: null, eligibility_summary: null, eligibility: null, raw: {},
    created_at: "2026-06-25T00:00:00Z", updated_at: "2026-06-25T00:00:00Z", ...over,
  };
}

describe("defaultFeedFilter", () => {
  it("기본 마감숨김 true", () => {
    expect(defaultFeedFilter()).toEqual({ hideExpired: true });
  });
});

describe("kindToSources", () => {
  it("sale→apt, rent→임대3, 전체→undefined", () => {
    expect(kindToSources("sale")).toEqual(["apt"]);
    expect(kindToSources("rent")).toEqual(["lh", "sh", "private"]);
    expect(kindToSources(undefined)).toBeUndefined();
  });
});

describe("fromSearchParams / toSearchParams", () => {
  it("kind·expired 파싱", () => {
    expect(fromSearchParams({ kind: "rent", expired: "1" })).toEqual({ kind: "rent", hideExpired: false });
    expect(fromSearchParams({})).toEqual({ kind: undefined, hideExpired: true });
    expect(fromSearchParams({ kind: "bogus" })).toEqual({ kind: undefined, hideExpired: true });
  });
  it("왕복", () => {
    expect(toSearchParams({ kind: "sale", hideExpired: false }).toString()).toBe("kind=sale&expired=1");
    expect(toSearchParams({ hideExpired: true }).toString()).toBe("");
  });
});

describe("matchesKind / passesFilter", () => {
  it("분양 필터는 apt만", () => {
    expect(matchesKind(notice({ source: "apt" }), "sale")).toBe(true);
    expect(matchesKind(notice({ source: "lh" }), "sale")).toBe(false);
  });
  it("마감숨김이면 만료 공고 제외", () => {
    const expired = notice({ apply_end: "2026-06-01" });
    expect(passesFilter(expired, { hideExpired: true }, "2026-06-25")).toBe(false);
    expect(passesFilter(expired, { hideExpired: false }, "2026-06-25")).toBe(true);
  });
  it("유형+마감 동시 적용", () => {
    const n = notice({ source: "lh", apply_end: "2026-12-31" });
    expect(passesFilter(n, { kind: "rent", hideExpired: true }, "2026-06-25")).toBe(true);
    expect(passesFilter(n, { kind: "sale", hideExpired: true }, "2026-06-25")).toBe(false);
  });
});
