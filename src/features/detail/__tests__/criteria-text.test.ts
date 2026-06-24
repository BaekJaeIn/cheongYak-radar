import { describe, it, expect } from "vitest";
import { summarizeCriteria, formatWon } from "@/features/detail/criteria-text";

describe("formatWon", () => {
  it("억/만원 표기", () => {
    expect(formatWon(120_000_000)).toBe("1.2억원");
    expect(formatWon(300_000_000)).toBe("3억원");
    expect(formatWon(38_030_000)).toBe("3,803만원");
    expect(formatWon(5_000)).toBe("5,000원");
  });
});

describe("summarizeCriteria (BR-U4-3)", () => {
  it("빈 입력은 빈 배열", () => {
    expect(summarizeCriteria(null)).toEqual([]);
    expect(summarizeCriteria({ supplyTypes: [] })).toEqual([]);
  });

  it("각 조건을 문장화", () => {
    const lines = summarizeCriteria({
      supplyTypes: ["신혼희망타운"],
      incomePctLimit: 130,
      assetLimit: 349_000_000,
      residencyReq: { region: "안양시", months: 12 },
      savingsReq: { months: 12, count: 12 },
      preNewlywedAllowed: true,
      firstTimeEligible: true,
    });
    expect(lines.some((l) => l.includes("130%"))).toBe(true);
    expect(lines.some((l) => l.includes("3.5억원"))).toBe(true);
    expect(lines.some((l) => l.includes("안양시 거주 12개월"))).toBe(true);
    expect(lines.some((l) => l.includes("청약통장 12회"))).toBe(true);
    expect(lines.some((l) => l.includes("예비신혼"))).toBe(true);
    expect(lines.some((l) => l.includes("생애최초"))).toBe(true);
  });
});
