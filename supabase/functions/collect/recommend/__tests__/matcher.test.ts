import { describe, it, expect } from "vitest";
import { evaluate, resolveSupplyTypes } from "../matcher.ts";
import { CRITERIA_2026 } from "../criteria-2026.ts";
import type { HouseholdProfile } from "../types.ts";
import type { NoticeInput } from "../../types.ts";

// 합성 프로필 (실제 수치 아님 — 공개 테스트용)
const profile: HouseholdProfile = {
  maritalStatus: "pre_newlywed",
  homeless: true,
  headOfHousehold: true,
  children: 0,
  members: 2,
  self: { birthYear: 1996, monthlyIncome: 3_000_000, savingsAccount: { count: 76 } },
  partner: { birthYear: 1998, monthlyIncome: 2_000_000 },
  assets: { financial: 100_000_000, carValue: 2_000_000 },
  residence: { sido: "경기", sigu: "부천시", since: "2026-04-01" },
  firstTimeBuyer: true,
  preferences: { areaMin: 50, areaMax: 59, regions: ["안양시"], sources: ["apt"] },
};

function notice(over: Partial<NoticeInput>): NoticeInput {
  return {
    id: "apt:1",
    source_no: "1",
    source: "apt",
    title: "테스트 공고",
    region_sido: "경기",
    region_sigu: "안양시",
    area_min: 55,
    area_max: 59,
    notice_date: null,
    apply_start: null,
    apply_end: "2026-12-31",
    winner_date: null,
    supply_type: null,
    newlywed: false,
    pre_newlywed: false,
    priority: "1순위",
    url: null,
    eligibility: null,
    raw: {},
    ...over,
  };
}

const TODAY = "2026-06-25";

describe("resolveSupplyTypes (BR-U6-8)", () => {
  it("eligibility.supplyTypes를 우선 사용", () => {
    const n = notice({ eligibility: { supplyTypes: ["신혼희망타운"] } });
    expect(resolveSupplyTypes(n)).toEqual(["신혼희망타운"]);
  });
  it("정보 없으면 일반공급 가정", () => {
    expect(resolveSupplyTypes(notice({}))).toEqual(["일반공급"]);
  });
});

describe("evaluate (BR-U6-1~8)", () => {
  it("무주택 아니면 ineligible (핵심 선결조건)", () => {
    const n = notice({ eligibility: { supplyTypes: ["신혼부부특별공급"] } });
    const r = evaluate(n, { ...profile, homeless: false }, CRITERIA_2026, TODAY);
    expect(r.anyEligible).toBe(false);
    expect(r.perSupplyType[0].status).toBe("ineligible");
  });

  it("예비신혼 + 신혼특공 → 혼인신고 안내 사유", () => {
    const n = notice({ eligibility: { supplyTypes: ["신혼부부특별공급"] } });
    const r = evaluate(n, profile, CRITERIA_2026, TODAY);
    const m = r.perSupplyType[0];
    expect(["eligible", "conditional"]).toContain(m.status);
    expect(m.reasons.join()).toMatch(/혼인신고/);
  });

  it("예비신혼 + 생애최초 → conditional(혼인 후 자격)", () => {
    const n = notice({ eligibility: { supplyTypes: ["생애최초"] } });
    const r = evaluate(n, profile, CRITERIA_2026, TODAY);
    expect(r.perSupplyType[0].status).toBe("conditional");
  });

  it("소득 초과 시 ineligible", () => {
    const rich = {
      ...profile,
      self: { ...profile.self, monthlyIncome: 8_000_000 },
      partner: { ...profile.partner, monthlyIncome: 8_000_000 },
    };
    const n = notice({ eligibility: { supplyTypes: ["신혼부부특별공급"] } });
    const r = evaluate(n, rich, CRITERIA_2026, TODAY);
    expect(r.perSupplyType[0].status).toBe("ineligible");
    expect(r.perSupplyType[0].reasons.join()).toMatch(/소득 기준 초과/);
  });

  it("소득 기준 미상 유형은 conditional(정보부족, BR-U6-7)", () => {
    const n = notice({ eligibility: { supplyTypes: ["다자녀"] } });
    const r = evaluate(n, profile, CRITERIA_2026, TODAY);
    expect(r.perSupplyType[0].status).toBe("conditional");
    expect(r.perSupplyType[0].reasons.join()).toMatch(/확인 필요/);
  });

  it("일반공급은 소득 조건 없이 eligible 가능", () => {
    const n = notice({ eligibility: { supplyTypes: ["일반공급"] } });
    const r = evaluate(n, profile, CRITERIA_2026, TODAY);
    expect(r.anyEligible).toBe(true);
  });
});
