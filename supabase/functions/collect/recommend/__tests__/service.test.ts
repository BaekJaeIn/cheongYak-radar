import { describe, it, expect } from "vitest";
import { collectNewIds } from "../service.ts";

describe("collectNewIds (v6 BR-U8-7) — upsert 결과 → 신규 추천 id", () => {
  it("was_inserted=true만 추출", () => {
    expect(
      collectNewIds([
        { notice_id: "apt:1", was_inserted: true },
        { notice_id: "apt:2", was_inserted: false },
        { notice_id: "lh:3", was_inserted: true },
      ]),
    ).toEqual(["apt:1", "lh:3"]);
  });
  it("null/undefined/빈 배열은 빈 결과", () => {
    expect(collectNewIds(null)).toEqual([]);
    expect(collectNewIds(undefined)).toEqual([]);
    expect(collectNewIds([])).toEqual([]);
  });
});
