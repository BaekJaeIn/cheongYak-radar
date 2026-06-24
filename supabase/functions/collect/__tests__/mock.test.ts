import { describe, it, expect } from "vitest";
import { getMockNotices } from "../mock.ts";

describe("getMockNotices (BR-7, US-1.7)", () => {
  const today = new Date("2026-06-24T00:00:00Z");
  const set = getMockNotices(today);

  it("현실적 규모(15~25건)이다", () => {
    expect(set.length).toBeGreaterThanOrEqual(15);
    expect(set.length).toBeLessThanOrEqual(25);
  });

  it("모든 항목이 합성 키(source:no)를 갖는다", () => {
    for (const n of set) expect(n.id).toContain(":");
  });

  it("4개 source가 모두 포함된다", () => {
    const sources = new Set(set.map((n) => n.source));
    expect(sources).toEqual(new Set(["apt", "lh", "sh", "private"]));
  });

  it("신혼/예비신혼/무순위가 섞여 있다", () => {
    expect(set.some((n) => n.newlywed)).toBe(true);
    expect(set.some((n) => n.pre_newlywed)).toBe(true);
    expect(set.some((n) => n.priority === "무순위")).toBe(true);
  });

  it("마감 전/마감된 공고가 모두 존재한다", () => {
    const todayStr = today.toISOString().slice(0, 10);
    expect(set.some((n) => (n.apply_end ?? "9999") >= todayStr)).toBe(true);
    expect(set.some((n) => (n.apply_end ?? "9999") < todayStr)).toBe(true);
  });

  it("면적은 min<=max 불변식을 지킨다", () => {
    for (const n of set) {
      if (n.area_min != null && n.area_max != null) {
        expect(n.area_min).toBeLessThanOrEqual(n.area_max);
      }
    }
  });
});
