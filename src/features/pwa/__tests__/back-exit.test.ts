import { describe, it, expect } from "vitest";
import { isSecondPress, EXIT_WINDOW_MS } from "@/features/pwa/BackExitGuard";

describe("isSecondPress (v7 FR-16) — 뒤로가기 2회 종료 판정", () => {
  it("2초 내 재입력이면 종료", () => {
    expect(isSecondPress(1000, 1000 + EXIT_WINDOW_MS - 1)).toBe(true);
  });
  it("2초 경과면 종료 아님(토스트 재표시)", () => {
    expect(isSecondPress(1000, 1000 + EXIT_WINDOW_MS)).toBe(false);
  });
  it("최초 입력(lastMs=0)은 종료 아님", () => {
    expect(isSecondPress(0, Date.now())).toBe(false);
  });
});
