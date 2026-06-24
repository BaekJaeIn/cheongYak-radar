import { describe, it, expect } from "vitest";
import { buildTimeline } from "@/features/detail/timeline";
import type { Notice } from "@/lib/types/notice";

function notice(over: Partial<Notice>): Notice {
  return {
    id: "apt:1", source_no: "1", source: "apt", title: "공고",
    region_sido: "경기", region_sigu: "안양시", area_min: null, area_max: null,
    notice_date: "2026-06-20", apply_start: "2026-06-28", apply_end: "2026-07-02",
    winner_date: "2026-07-10", supply_type: null, newlywed: false, pre_newlywed: false,
    priority: null, url: null, eligibility_summary: null, eligibility: null, raw: {},
    created_at: "2026-06-20T00:00:00Z", updated_at: "2026-06-20T00:00:00Z", ...over,
  };
}

describe("buildTimeline (BR-U4-2)", () => {
  it("값 있는 단계만, today 기준 상태", () => {
    const t = buildTimeline(notice({}), "2026-06-28");
    expect(t.map((s) => s.key)).toEqual(["notice", "apply_start", "apply_end", "winner"]);
    expect(t.find((s) => s.key === "notice")!.state).toBe("past");
    expect(t.find((s) => s.key === "apply_start")!.state).toBe("current");
    expect(t.find((s) => s.key === "winner")!.state).toBe("upcoming");
  });

  it("null 단계는 제외", () => {
    const t = buildTimeline(notice({ winner_date: null, notice_date: null }), "2026-06-25");
    expect(t.map((s) => s.key)).toEqual(["apply_start", "apply_end"]);
  });

  it("모두 null이면 빈 배열", () => {
    const t = buildTimeline(
      notice({ notice_date: null, apply_start: null, apply_end: null, winner_date: null }),
      "2026-06-25",
    );
    expect(t).toHaveLength(0);
  });
});
