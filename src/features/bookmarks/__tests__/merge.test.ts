import { describe, it, expect } from "vitest";
import { planMergeRows } from "@/features/bookmarks/repository";

const UID = "00000000-0000-0000-0000-000000000001";

describe("planMergeRows (v6 BR-U8-8) — 로컬 북마크 → DB 병합 계획", () => {
  it("존재하는 공고만 insert 행으로 (FK 위반 방지)", () => {
    expect(planMergeRows(["apt:1", "gone:9"], ["apt:1"], UID)).toEqual([
      { user_id: UID, notice_id: "apt:1" },
    ]);
  });
  it("로컬 중복 제거", () => {
    expect(planMergeRows(["apt:1", "apt:1"], ["apt:1"], UID)).toEqual([
      { user_id: UID, notice_id: "apt:1" },
    ]);
  });
  it("빈 로컬/모두 삭제된 공고면 빈 배열", () => {
    expect(planMergeRows([], ["apt:1"], UID)).toEqual([]);
    expect(planMergeRows(["gone:9"], [], UID)).toEqual([]);
  });
});
