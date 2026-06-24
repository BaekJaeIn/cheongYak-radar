import { describe, it, expect } from "vitest";
import { makeNoticeId, toRpcRow, upsertNotices } from "@/features/notices/upserter";
import type { NoticeInput } from "@/lib/types/notice";

const sample: NoticeInput = {
  id: "",
  source_no: "2026000123",
  source: "apt",
  title: "평촌 신혼희망타운",
  region_sido: "경기",
  region_sigu: "안양시",
  area_min: 46,
  area_max: 59,
  notice_date: "2026-06-20",
  apply_start: "2026-06-28",
  apply_end: "2026-07-02",
  winner_date: "2026-07-10",
  supply_type: "신혼부부",
  newlywed: true,
  pre_newlywed: true,
  priority: "1순위",
  url: "https://www.applyhome.co.kr",
  raw: { foo: "bar" },
};

describe("makeNoticeId (BR-1)", () => {
  it("source:source_no 합성 키를 만든다", () => {
    expect(makeNoticeId("apt", "2026000123")).toBe("apt:2026000123");
    expect(makeNoticeId("lh", "X1")).toBe("lh:X1");
  });
});

describe("toRpcRow", () => {
  it("id가 비어 있으면 합성 키로 채운다", () => {
    expect(toRpcRow(sample).id).toBe("apt:2026000123");
  });

  it("id가 있으면 유지한다", () => {
    expect(toRpcRow({ ...sample, id: "apt:custom" }).id).toBe("apt:custom");
  });

  it("eligibility_summary 미지정 시 null로 채운다", () => {
    expect(toRpcRow(sample).eligibility_summary).toBeNull();
  });

  it("모든 도메인 필드를 매핑한다", () => {
    const row = toRpcRow(sample);
    expect(row.region_sigu).toBe("안양시");
    expect(row.newlywed).toBe(true);
    expect(row.priority).toBe("1순위");
    expect(row.raw).toEqual({ foo: "bar" });
  });
});

describe("upsertNotices", () => {
  it("빈 배열이면 RPC 호출 없이 빈 결과를 반환한다", async () => {
    let called = false;
    const fakeClient = {
      rpc: async () => {
        called = true;
        return { data: [], error: null };
      },
    } as unknown as Parameters<typeof upsertNotices>[0];
    const res = await upsertNotices(fakeClient, []);
    expect(res).toEqual({ inserted: [], updated: [] });
    expect(called).toBe(false);
  });

  it("was_inserted 플래그로 inserted/updated를 분리한다 (newIds 산출)", async () => {
    const fakeClient = {
      rpc: async (_fn: string, _args: unknown) => ({
        data: [
          { id: "apt:1", was_inserted: true },
          { id: "lh:2", was_inserted: false },
          { id: "apt:3", was_inserted: true },
        ],
        error: null,
      }),
    } as unknown as Parameters<typeof upsertNotices>[0];

    const res = await upsertNotices(fakeClient, [sample]);
    expect(res.inserted).toEqual(["apt:1", "apt:3"]);
    expect(res.updated).toEqual(["lh:2"]);
  });

  it("RPC 에러를 throw한다", async () => {
    const fakeClient = {
      rpc: async () => ({ data: null, error: { message: "boom" } }),
    } as unknown as Parameters<typeof upsertNotices>[0];
    await expect(upsertNotices(fakeClient, [sample])).rejects.toThrow(/boom/);
  });
});
