import { describe, it, expect } from "vitest";
import { parseExtracted, toNoticeInput, type ExtractedNotice } from "../analyze.ts";

const FULL_JSON = JSON.stringify({
  isNotice: true,
  title: "안양 매곡 신혼희망타운",
  regionSido: "경기",
  regionSigu: "안양시",
  applyStart: "2026-08-01",
  applyEnd: "2026-08-05",
  supplyTypes: ["신혼희망타운", "생애최초"],
  eligibility: {
    incomePctLimit: 130,
    assetLimit: 370000000,
    carLimit: 38000000,
    residencyReq: { region: "수도권", months: 12 },
    savingsReq: { months: 6, count: 6 },
    preNewlywedAllowed: true,
    firstTimeEligible: true,
  },
});

describe("parseExtracted (BR-U7-2)", () => {
  it("정상 JSON — 전 필드 매핑", () => {
    const ex = parseExtracted(FULL_JSON)!;
    expect(ex.isNotice).toBe(true);
    expect(ex.title).toBe("안양 매곡 신혼희망타운");
    expect(ex.regionSido).toBe("경기");
    expect(ex.applyStart).toBe("2026-08-01");
    expect(ex.supplyTypes).toEqual(["신혼희망타운", "생애최초"]);
    expect(ex.eligibility.incomePctLimit).toBe(130);
    expect(ex.eligibility.residencyReq).toEqual({ region: "수도권", months: 12 });
    expect(ex.eligibility.savingsReq).toEqual({ months: 6, count: 6 });
    expect(ex.eligibility.preNewlywedAllowed).toBe(true);
  });

  it("코드펜스 방어 — ```json 래핑 제거", () => {
    const ex = parseExtracted("```json\n" + FULL_JSON + "\n```");
    expect(ex?.title).toBe("안양 매곡 신혼희망타운");
  });

  it("비공고 문서 — isNotice=false 유지", () => {
    const ex = parseExtracted(JSON.stringify({ isNotice: false }))!;
    expect(ex.isNotice).toBe(false);
    expect(ex.supplyTypes).toEqual([]);
  });

  it("파싱 실패/형식 불량 → null", () => {
    expect(parseExtracted("공고 요약: 신혼부부 대상...")).toBeNull();
    expect(parseExtracted(JSON.stringify({ title: "x" }))).toBeNull(); // isNotice 누락
    expect(parseExtracted(JSON.stringify(null))).toBeNull();
  });

  it("부분 null·불량 값 — 안전 기본값 (없는 값은 채우지 않음)", () => {
    const ex = parseExtracted(
      JSON.stringify({
        isNotice: true,
        title: "  ",
        supplyTypes: ["일반공급", 3, ""],
        eligibility: { incomePctLimit: "130", residencyReq: { region: "수도권" } },
      }),
    )!;
    expect(ex.title).toBeNull(); // 공백 → null
    expect(ex.supplyTypes).toEqual(["일반공급"]); // 문자열만
    expect(ex.eligibility.incomePctLimit).toBeUndefined(); // 숫자 아님
    expect(ex.eligibility.residencyReq).toBeUndefined(); // months 누락
    expect(ex.applyStart).toBeNull();
  });
});

describe("toNoticeInput (D-3)", () => {
  const base: ExtractedNotice = parseExtracted(FULL_JSON)!;

  it("합성 NoticeInput — id·필드 매핑·eligibility 전달", () => {
    const n = toNoticeInput(base);
    expect(n.id).toBe("analyze:upload");
    expect(n.source).toBe("private");
    expect(n.region_sido).toBe("경기");
    expect(n.apply_start).toBe("2026-08-01");
    expect(n.supply_type).toBe("신혼희망타운");
    expect(n.eligibility?.supplyTypes).toEqual(["신혼희망타운", "생애최초"]);
  });

  it("신혼 플래그 유도 — 공급유형·preNewlywedAllowed 기반", () => {
    const n = toNoticeInput(base);
    expect(n.newlywed).toBe(true); // "신혼희망타운" 포함
    expect(n.pre_newlywed).toBe(true); // preNewlywedAllowed=true

    const plain = toNoticeInput({
      ...base,
      supplyTypes: ["일반공급"],
      eligibility: { ...base.eligibility, preNewlywedAllowed: undefined },
    });
    expect(plain.newlywed).toBe(false);
    expect(plain.pre_newlywed).toBe(false);
  });

  it("빈 추출 — null 기본값", () => {
    const n = toNoticeInput(parseExtracted(JSON.stringify({ isNotice: true }))!);
    expect(n.title).toBe("업로드한 공고");
    expect(n.supply_type).toBeNull();
    expect(n.apply_end).toBeNull();
  });
});
