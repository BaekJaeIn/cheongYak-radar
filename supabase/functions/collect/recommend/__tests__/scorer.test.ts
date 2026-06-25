import { describe, it, expect } from "vitest";
import { rank, regionScore, areaScore, tooSmallForCouple, isPreferredRegion } from "../scorer.ts";
import type { HouseholdProfile, MatchResult } from "../types.ts";
import type { NoticeInput } from "../../types.ts";

const profile: HouseholdProfile = {
  maritalStatus: "pre_newlywed",
  homeless: true,
  headOfHousehold: true,
  children: 0,
  members: 2,
  self: { birthYear: 1996, monthlyIncome: 3_000_000 },
  partner: { birthYear: 1998, monthlyIncome: 2_000_000 },
  assets: { financial: 100_000_000, carValue: 2_000_000 },
  residence: { sido: "경기", sigu: "부천시", since: "2026-04-01" },
  firstTimeBuyer: true,
  preferences: { areaMin: 50, areaMax: 59, regions: ["안양시", "산본"], sources: ["apt"] },
};

const TODAY = "2026-06-25";

function notice(over: Partial<NoticeInput>): NoticeInput {
  return {
    id: "apt:1", source_no: "1", source: "apt", title: "공고",
    region_sido: "경기", region_sigu: "안양시", area_min: 55, area_max: 59,
    notice_date: null, apply_start: null, apply_end: "2026-12-31", winner_date: null,
    supply_type: null, newlywed: false, pre_newlywed: false, priority: "1순위",
    url: null, eligibility: null, raw: {}, ...over,
  };
}
function match(noticeId: string, anyEligible: boolean, status: "eligible" | "conditional" = "eligible"): MatchResult {
  return { noticeId, anyEligible, perSupplyType: [{ type: "일반공급", status, reasons: [] }] };
}

describe("regionScore (A4=A)", () => {
  it("관심지역(안양시) 일치 → 1.0", () => {
    expect(regionScore(notice({ region_sigu: "안양시" }), profile)).toBe(1.0);
  });
  it("별칭(산본→군포시) 일치 → 1.0", () => {
    expect(regionScore(notice({ region_sigu: "군포시" }), profile)).toBe(1.0);
  });
  it("관심지역 외 경기 → 0.5 또는 0.2", () => {
    const s = regionScore(notice({ region_sido: "경기", region_sigu: "성남시" }), profile);
    expect(s).toBeLessThan(1.0);
  });
});

describe("areaScore", () => {
  it("희망 면적과 겹치면 1.0", () => {
    expect(areaScore(notice({ area_min: 55, area_max: 59 }), profile)).toBe(1.0);
  });
  it("크게 벗어나면 0", () => {
    expect(areaScore(notice({ area_min: 100, area_max: 120 }), profile)).toBe(0);
  });
});

describe("isPreferredRegion (v2 먼 경기 제외)", () => {
  it("관심 시군구(안양시) 일치 → 포함", () => {
    expect(isPreferredRegion(notice({ region_sigu: "안양시" }), profile)).toBe(true);
  });
  it("별칭(산본→군포시) 일치 → 포함", () => {
    expect(isPreferredRegion(notice({ region_sigu: "군포시" }), profile)).toBe(true);
  });
  it("관심지역 외 먼 경기(이천·양주·화성) → 제외", () => {
    expect(isPreferredRegion(notice({ region_sido: "경기", region_sigu: "이천시" }), profile)).toBe(false);
    expect(isPreferredRegion(notice({ region_sido: "경기", region_sigu: "양주시" }), profile)).toBe(false);
    expect(isPreferredRegion(notice({ region_sido: "경기", region_sigu: "화성시" }), profile)).toBe(false);
  });
  it("시군구 미상(경기 표기만)은 유지 — 데이터 미비 시 비우지 않음", () => {
    expect(isPreferredRegion(notice({ region_sido: "경기", region_sigu: null }), profile)).toBe(true);
  });
  it("서울은 인접 권역으로 유지", () => {
    expect(isPreferredRegion(notice({ region_sido: "서울", region_sigu: "동작구" }), profile)).toBe(true);
  });
  it("관심지역 미설정이면 전체 허용", () => {
    const noPref = { ...profile, preferences: { ...profile.preferences, regions: [] } };
    expect(isPreferredRegion(notice({ region_sigu: "이천시" }), noPref)).toBe(true);
  });
});

describe("tooSmallForCouple (v2 원룸 제외)", () => {
  it("희망 하한(50)보다 작은 평형은 제외 대상", () => {
    expect(tooSmallForCouple(notice({ area_min: 16, area_max: 29 }), profile)).toBe(true);
  });
  it("희망 하한 이상이면 유지", () => {
    expect(tooSmallForCouple(notice({ area_min: 49, area_max: 59 }), profile)).toBe(false);
  });
  it("면적 미상이면 유지(베스트에포트)", () => {
    expect(tooSmallForCouple(notice({ area_min: null, area_max: null }), profile)).toBe(false);
  });
});

describe("rank (BR-U6-9~12)", () => {
  it("너무 작은 평형(원룸)은 추천에서 제외 (v2)", () => {
    const notices = [notice({ id: "apt:1", area_min: 18, area_max: 24 })];
    const recs = rank([match("apt:1", true)], notices, profile, undefined, TODAY);
    expect(recs).toHaveLength(0);
  });

  it("자격 없는 공고는 제외", () => {
    const notices = [notice({ id: "apt:1" })];
    const recs = rank([match("apt:1", false)], notices, profile, undefined, TODAY);
    expect(recs).toHaveLength(0);
  });

  it("마감된 공고는 제외", () => {
    const notices = [notice({ id: "apt:1", apply_end: "2026-06-01" })];
    const recs = rank([match("apt:1", true)], notices, profile, undefined, TODAY);
    expect(recs).toHaveLength(0);
  });

  it("먼 경기(성남시 등) 관심지역 외 공고는 추천 제외 (v2)", () => {
    const notices = [notice({ id: "apt:1", region_sido: "경기", region_sigu: "성남시" })];
    const recs = rank([match("apt:1", true)], notices, profile, undefined, TODAY);
    expect(recs).toHaveLength(0);
  });

  it("관심지역+1순위 공고가 더 높은 점수로 상단 정렬", () => {
    const notices = [
      notice({ id: "apt:1", region_sigu: "안양시", priority: "1순위" }),
      // 산본→군포시 별칭으로 관심지역 내, 단 무순위·면적 차이로 점수 낮음
      notice({ id: "apt:2", region_sigu: "군포시", priority: "무순위", area_min: 100, area_max: 110 }),
    ];
    const recs = rank(
      [match("apt:1", true), match("apt:2", true, "conditional")],
      notices,
      profile,
      undefined,
      TODAY,
    );
    expect(recs[0].noticeId).toBe("apt:1");
    expect(recs[0].score).toBeGreaterThan(recs[1].score);
    expect(recs[0].reasonSummary.length).toBeGreaterThan(0);
  });

  it("점수는 0~100 범위, breakdown 합과 일치", () => {
    const notices = [notice({ id: "apt:1" })];
    const recs = rank([match("apt:1", true)], notices, profile, undefined, TODAY);
    const r = recs[0];
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    const sum = Object.values(r.scoreBreakdown).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - r.score)).toBeLessThan(0.5);
  });
});
