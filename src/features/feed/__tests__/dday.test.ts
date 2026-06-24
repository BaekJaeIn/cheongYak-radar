import { describe, it, expect } from "vitest";
import { ddayLabel, daysUntil, isExpired, isNew } from "@/features/feed/dday";

const TODAY = "2026-06-25";

describe("daysUntil", () => {
  it("일수 계산", () => {
    expect(daysUntil("2026-06-28", TODAY)).toBe(3);
    expect(daysUntil("2026-06-25", TODAY)).toBe(0);
    expect(daysUntil("2026-06-20", TODAY)).toBe(-5);
    expect(daysUntil(null, TODAY)).toBeNull();
  });
});

describe("ddayLabel", () => {
  it("D-n / 오늘마감 / 마감 / null", () => {
    expect(ddayLabel("2026-06-28", TODAY)).toBe("D-3");
    expect(ddayLabel("2026-06-25", TODAY)).toBe("오늘마감");
    expect(ddayLabel("2026-06-20", TODAY)).toBe("마감");
    expect(ddayLabel(null, TODAY)).toBeNull();
  });
});

describe("isExpired / isNew", () => {
  it("isExpired", () => {
    expect(isExpired("2026-06-20", TODAY)).toBe(true);
    expect(isExpired("2026-06-30", TODAY)).toBe(false);
    expect(isExpired(null, TODAY)).toBe(false);
  });
  it("isNew는 created_at 날짜가 오늘", () => {
    expect(isNew("2026-06-25T03:00:00Z", TODAY)).toBe(true);
    expect(isNew("2026-06-24T03:00:00Z", TODAY)).toBe(false);
  });
});
