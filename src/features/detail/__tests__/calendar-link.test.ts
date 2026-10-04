import { describe, it, expect } from "vitest";
import { buildCalendarEvent, buildGoogleCalendarUrl } from "@/features/detail/calendar-link";
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

function paramsOf(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

describe("buildGoogleCalendarUrl (FR-11)", () => {
  it("날짜가 하나도 없으면 null", () => {
    expect(
      buildCalendarEvent(notice({ notice_date: null, apply_start: null, apply_end: null })),
    ).toBeNull();
  });

  it("apply_start 있으면 청약시작 단계", () => {
    expect(buildCalendarEvent(notice({}))!.stageKey).toBe("apply_start");
  });

  it("apply_start 없으면(LH·GH) 청약마감일로 대체", () => {
    const ev = buildCalendarEvent(
      notice({ source: "lh", title: "LH 행복주택", apply_start: null, url: "https://apply.lh.or.kr/n/1" }),
    )!;
    expect(ev.stageKey).toBe("apply_end");
    const p = paramsOf(ev.url);
    expect(p.get("text")).toBe("[청약마감] LH 행복주택");
    expect(p.get("dates")).toBe("20260702/20260703");
    expect(p.get("details")).toBe("청약 접수 마감: 2026-07-02\n공고 원문: https://apply.lh.or.kr/n/1");
  });

  it("공고일만 있으면(SH) 모집공고일로 대체", () => {
    const ev = buildCalendarEvent(
      notice({ source: "sh", title: "SH 장기전세", apply_start: null, apply_end: null }),
    )!;
    expect(ev.stageKey).toBe("notice");
    const p = paramsOf(ev.url);
    expect(p.get("text")).toBe("[모집공고] SH 장기전세");
    expect(p.get("dates")).toBe("20260620/20260621");
    expect(p.get("details")).toBe("모집공고일: 2026-06-20");
  });

  it("YYYY.MM.DD 형식 날짜도 처리", () => {
    const p = paramsOf(buildGoogleCalendarUrl(notice({ apply_start: "2026.12.31" }))!);
    expect(p.get("dates")).toBe("20261231/20270101");
  });

  it("템플릿 URL — action/제목/종일 dates(종료 exclusive)", () => {
    const url = buildGoogleCalendarUrl(notice({ title: "안양 신혼희망타운" }))!;
    expect(url.startsWith("https://calendar.google.com/calendar/render?")).toBe(true);
    const p = paramsOf(url);
    expect(p.get("action")).toBe("TEMPLATE");
    expect(p.get("text")).toBe("[청약시작] 안양 신혼희망타운");
    expect(p.get("dates")).toBe("20260628/20260629");
  });

  it("월/연 롤오버 — 다음날 계산", () => {
    const p1 = paramsOf(buildGoogleCalendarUrl(notice({ apply_start: "2026-06-30" }))!);
    expect(p1.get("dates")).toBe("20260630/20260701");
    const p2 = paramsOf(buildGoogleCalendarUrl(notice({ apply_start: "2026-12-31" }))!);
    expect(p2.get("dates")).toBe("20261231/20270101");
  });

  it("details — 접수기간 + 공고 원문 URL", () => {
    const p = paramsOf(
      buildGoogleCalendarUrl(notice({ url: "https://apply.lh.or.kr/n/1" }))!,
    );
    expect(p.get("details")).toBe(
      "청약 접수: 2026-06-28 ~ 2026-07-02\n공고 원문: https://apply.lh.or.kr/n/1",
    );
  });

  it("details — 마감일·원문 없으면 시작일만", () => {
    const p = paramsOf(buildGoogleCalendarUrl(notice({ apply_end: null }))!);
    expect(p.get("details")).toBe("청약 접수 시작: 2026-06-28");
  });
});
