import { describe, it, expect } from "vitest";
import { parseRegion } from "../region-alias.ts";
import { parseArea, inferNewlywed, mapPriority, normalize } from "../normalize.ts";

describe("parseRegion (BR-2)", () => {
  it("별칭(평촌)을 안양시로 매핑한다", () => {
    expect(parseRegion("경기도 안양시 동안구 평촌대로")).toEqual({ sido: "경기", sigu: "안양시" });
  });
  it("별칭(산본)을 군포시로 매핑한다", () => {
    expect(parseRegion("산본역 인근")).toMatchObject({ sigu: "군포시" });
  });
  it("정규식으로 시도/시군구를 추출한다", () => {
    expect(parseRegion("서울특별시 강서구 화곡동")).toEqual({ sido: "서울", sigu: "강서구" });
  });
  it("빈 값은 null/null", () => {
    expect(parseRegion(null)).toEqual({ sido: null, sigu: null });
  });
});

describe("parseArea (BR-3)", () => {
  it("범위 표기에서 min/max를 뽑는다", () => {
    expect(parseArea("전용 46.97㎡ ~ 59.96㎡")).toEqual({ min: 46.97, max: 59.96 });
  });
  it("단일 면적은 min=max", () => {
    expect(parseArea("84.95㎡")).toEqual({ min: 84.95, max: 84.95 });
  });
  it("숫자 없으면 null", () => {
    expect(parseArea("면적정보없음")).toEqual({ min: null, max: null });
  });
});

describe("inferNewlywed (BR-4)", () => {
  it("신혼희망/신혼부부 키워드면 newlywed=true", () => {
    expect(inferNewlywed("신혼희망타운").newlywed).toBe(true);
    expect(inferNewlywed("신혼부부 특별공급").newlywed).toBe(true);
  });
  it("예비신혼이면 preNewlywed=true", () => {
    const r = inferNewlywed("민간임대 예비신혼부부");
    expect(r.preNewlywed).toBe(true);
    expect(r.newlywed).toBe(true);
  });
  it("해당 없으면 false", () => {
    expect(inferNewlywed("일반공급")).toEqual({ newlywed: false, preNewlywed: false });
  });
});

describe("mapPriority (BR-5)", () => {
  it("무순위/줍줍 → 무순위", () => {
    expect(mapPriority("무순위")).toBe("무순위");
    expect(mapPriority("줍줍 사전청약")).toBe("무순위");
  });
  it("1순위/2순위 매핑", () => {
    expect(mapPriority("1순위")).toBe("1순위");
    expect(mapPriority("2순위 접수")).toBe("2순위");
  });
  it("불명확하면 null", () => {
    expect(mapPriority("접수중")).toBeNull();
    expect(mapPriority(null)).toBeNull();
  });
});

describe("normalize (BR-1 통합)", () => {
  it("RawNotice를 NoticeInput으로 변환하고 합성 키를 만든다", () => {
    const n = normalize("apt", {
      source_no: "2026000101",
      title: "평촌 어바인퍼스트 신혼희망타운",
      address: "경기도 안양시 동안구 평촌대로",
      areaText: "46.97㎡ ~ 59.96㎡",
      supplyType: "신혼희망타운",
      priorityText: "1순위",
      apply_end: "2026-07-01",
      url: "https://x",
    });
    expect(n).not.toBeNull();
    expect(n!.id).toBe("apt:2026000101");
    expect(n!.region_sigu).toBe("안양시");
    expect(n!.newlywed).toBe(true);
    expect(n!.priority).toBe("1순위");
    expect(n!.area_min).toBe(46.97);
  });

  it("source_no/title 누락이면 null(skip)", () => {
    expect(normalize("lh", { source_no: "", title: "x" })).toBeNull();
    expect(normalize("lh", { source_no: "1", title: "" })).toBeNull();
  });

  it("SH는 시도를 서울로 보정한다", () => {
    const n = normalize("sh", { source_no: "S1", title: "장기전세", address: "정보없음" });
    expect(n!.region_sido).toBe("서울");
  });
});
