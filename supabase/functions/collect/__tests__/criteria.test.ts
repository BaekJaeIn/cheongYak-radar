import { describe, it, expect } from "vitest";
import {
  extractCriteria,
  extractSupplyTypes,
  isRegionInScope,
} from "../criteria.ts";

describe("isRegionInScope (C-6 서울·경기 한정)", () => {
  it("서울/경기는 범위 안", () => {
    expect(isRegionInScope("서울")).toBe(true);
    expect(isRegionInScope("경기")).toBe(true);
  });
  it("그 외 시도는 범위 밖", () => {
    expect(isRegionInScope("인천")).toBe(false);
    expect(isRegionInScope("부산")).toBe(false);
  });
  it("미파악(null)은 베스트에포트로 유지", () => {
    expect(isRegionInScope(null)).toBe(true);
    expect(isRegionInScope(undefined)).toBe(true);
  });
});

describe("extractSupplyTypes", () => {
  it("신혼희망타운/신혼부부특별공급을 라벨로 추출", () => {
    expect(extractSupplyTypes("신혼희망타운")).toContain("신혼희망타운");
    expect(extractSupplyTypes("신혼부부 특별공급")).toContain("신혼부부특별공급");
  });
  it("무순위/줍줍 → 무순위", () => {
    expect(extractSupplyTypes("무순위 줍줍")).toEqual(["무순위"]);
  });
  it("일반공급 추출", () => {
    expect(extractSupplyTypes("일반공급")).toContain("일반공급");
  });
  it("해당 없으면 빈 배열", () => {
    expect(extractSupplyTypes("기타 안내")).toEqual([]);
  });
});

describe("extractCriteria (FR-9 베스트에포트)", () => {
  it("공급유형만 있으면 supplyTypes만 채운다", () => {
    const c = extractCriteria(["평촌 신혼희망타운", "신혼희망타운"]);
    expect(c).not.toBeNull();
    expect(c!.supplyTypes).toContain("신혼희망타운");
    expect(c!.incomePctLimit).toBeUndefined();
  });

  it("예비신혼/생애최초 플래그를 세운다", () => {
    const c = extractCriteria(["예비신혼부부 생애최초 특별공급"]);
    expect(c!.preNewlywedAllowed).toBe(true);
    expect(c!.firstTimeEligible).toBe(true);
  });

  it("소득 비율(%)을 추출한다", () => {
    const c = extractCriteria(["도시근로자 월평균소득 120% 이하"]);
    expect(c!.incomePctLimit).toBe(120);
  });

  it("총자산/자동차 한도(억·만원)를 원 단위로 변환", () => {
    const c = extractCriteria(["총자산 3.45억 이하, 자동차 3,708만원 이하"]);
    expect(c!.assetLimit).toBe(345000000);
    expect(c!.carLimit).toBe(37080000);
  });

  it("거주요건(년→개월)을 추출한다", () => {
    const c = extractCriteria(["경기도 2년 이상 거주자"]);
    expect(c!.residencyReq).toEqual({ region: "경기", months: 24 });
  });

  it("신호가 전혀 없으면 null", () => {
    expect(extractCriteria(["접수 안내문"])).toBeNull();
    expect(extractCriteria([null, undefined, ""])).toBeNull();
  });
});
