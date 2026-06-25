import { describe, it, expect } from "vitest";
import {
  fromSearchParams,
  toSearchParams,
  kindToSources,
  matchesKind,
  passesFilter,
  passesRegion,
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

describe("passesRegion (v2 관심지역 필터)", () => {
  const REGIONS = ["안양시", "산본", "평촌", "광명시"];
  it("관심 시군구·별칭(산본→군포시) 일치 → 포함", () => {
    expect(passesRegion(notice({ region_sigu: "안양시" }), REGIONS)).toBe(true);
    expect(passesRegion(notice({ region_sigu: "군포시" }), REGIONS)).toBe(true);
    expect(passesRegion(notice({ region_sigu: "광명시" }), REGIONS)).toBe(true);
  });
  it("먼 경기(이천·양주·화성)는 제외", () => {
    expect(passesRegion(notice({ region_sigu: "이천시" }), REGIONS)).toBe(false);
    expect(passesRegion(notice({ region_sigu: "양주시" }), REGIONS)).toBe(false);
    expect(passesRegion(notice({ region_sigu: "화성시" }), REGIONS)).toBe(false);
  });
  it("시군구 미상이고 제목도 도시 단서 없으면 유지(광역 매입임대 등)", () => {
    expect(passesRegion(notice({ region_sido: "경기", region_sigu: null, title: "공고" }), REGIONS)).toBe(true);
    expect(passesRegion(notice({ region_sido: "경기", region_sigu: null, title: "[경기북부] 26년 1차 든든전세주택" }), REGIONS)).toBe(true);
    expect(passesRegion(notice({ region_sido: "서울", region_sigu: "동작구" }), REGIONS)).toBe(true);
  });
  it("시군구 null이어도 제목에서 먼 도시 추론 시 제외(재수집 전 대응)", () => {
    expect(passesRegion(notice({ region_sido: "경기", region_sigu: null, title: "고양창릉 A-4BL 신혼희망타운" }), REGIONS)).toBe(false);
    expect(passesRegion(notice({ region_sido: "경기", region_sigu: null, title: "김포한강 Ac-01a블록" }), REGIONS)).toBe(false);
    expect(passesRegion(notice({ region_sido: "경기", region_sigu: null, title: "양주옥정 10년 공공임대" }), REGIONS)).toBe(false);
  });
  it("시군구 null이어도 제목이 관심지역이면 유지", () => {
    expect(passesRegion(notice({ region_sido: "경기", region_sigu: null, title: "평촌 어바인퍼스트 신혼희망타운" }), REGIONS)).toBe(true);
  });
  it("관심지역 미설정이면 전체 허용", () => {
    expect(passesRegion(notice({ region_sigu: "이천시" }), [])).toBe(true);
    expect(passesRegion(notice({ region_sigu: "이천시" }), undefined)).toBe(true);
  });
  it("passesFilter에 regions 결합 — 먼 경기 제외", () => {
    expect(passesFilter(notice({ region_sigu: "이천시" }), { hideExpired: true, regions: REGIONS }, "2026-06-25")).toBe(false);
    expect(passesFilter(notice({ region_sigu: "안양시" }), { hideExpired: true, regions: REGIONS }, "2026-06-25")).toBe(true);
  });
});
