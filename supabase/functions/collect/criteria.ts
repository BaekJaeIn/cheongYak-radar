// CriteriaExtractor (C28) — 공고 텍스트 → 구조화 자격조건(EligibilityCriteria).
// 순수·베스트에포트(부분 채움 허용). Deno/Node 공통 — vitest 테스트 가능.
// 근거: components.md C28, requirements.md §12.2 FR-9 / §12.4(U1 보강)
// 정밀 파싱은 Claude 보조(summarize 경로)로 보완 가능. 여기서는 규칙 기반 1차 추출.

import type { EligibilityCriteria } from "./types.ts";

/** v2 수집·추천 대상 지역 (C-6: 서울·경기 한정). */
export const REGION_SCOPE = ["서울", "경기"] as const;

/**
 * 시도가 수집 범위(서울·경기) 안인지. (C-6)
 * sido가 null(미파악)이면 베스트에포트로 유지(true) — 호출부가 드롭하지 않음.
 */
export function isRegionInScope(sido: string | null | undefined): boolean {
  if (!sido) return true;
  return (REGION_SCOPE as readonly string[]).includes(sido);
}

/** 공급유형 키워드 → 정규 라벨. 등장 순서대로 매칭(중복 제거). */
const SUPPLY_TYPE_RULES: { kw: RegExp; label: string }[] = [
  { kw: /신혼희망타운/, label: "신혼희망타운" },
  { kw: /신혼부부\s*특별공급|신혼부부특별공급/, label: "신혼부부특별공급" },
  { kw: /신혼/, label: "신혼부부" },
  { kw: /생애\s*최초/, label: "생애최초" },
  { kw: /다자녀/, label: "다자녀" },
  { kw: /노부모/, label: "노부모부양" },
  { kw: /장기전세/, label: "장기전세" },
  { kw: /행복주택/, label: "행복주택" },
  { kw: /국민임대/, label: "국민임대" },
  { kw: /영구임대/, label: "영구임대" },
  { kw: /청년/, label: "청년" },
  { kw: /민간임대/, label: "민간임대" },
  { kw: /무순위|줍줍/, label: "무순위" },
  { kw: /일반\s*공급|일반분양/, label: "일반공급" },
];

/** 텍스트에서 공급유형 라벨 집합 추출(중복 제거, 등장 규칙 순). */
export function extractSupplyTypes(text: string): string[] {
  const out: string[] = [];
  for (const { kw, label } of SUPPLY_TYPE_RULES) {
    if (kw.test(text) && !out.includes(label)) out.push(label);
  }
  return out;
}

/** "억"/"만원" 표기 금액 → 원 단위 숫자. 매칭 실패 시 undefined. */
function parseKrwAmount(text: string, anchor: RegExp): number | undefined {
  const seg = sliceNear(text, anchor);
  if (!seg) return undefined;
  const eok = seg.match(/([\d.]+)\s*억/);
  if (eok) return Math.round(parseFloat(eok[1]) * 1e8);
  const man = seg.match(/([\d,]+)\s*만\s*원?/);
  if (man) return Number(man[1].replace(/,/g, "")) * 1e4;
  return undefined;
}

/** anchor 정규식 매칭 위치 주변 텍스트(±30자)를 잘라 반환. */
function sliceNear(text: string, anchor: RegExp): string | null {
  const m = text.match(anchor);
  if (m?.index === undefined) return null;
  return text.slice(Math.max(0, m.index - 5), m.index + 30);
}

/**
 * 공고 텍스트(제목·공급유형·자격요건 본문 등)에서 자격조건을 베스트에포트 추출.
 * 추출된 정보가 전혀 없으면 null 반환(호출부에서 eligibility=null 유지).
 */
export function extractCriteria(parts: (string | null | undefined)[]): EligibilityCriteria | null {
  const text = parts.filter(Boolean).join(" ");
  if (!text.trim()) return null;

  const supplyTypes = extractSupplyTypes(text);
  const criteria: EligibilityCriteria = { supplyTypes };
  let hasSignal = supplyTypes.length > 0;

  // 소득 한도(%) — "도시근로자/소득 ... 120%"
  const pct = sliceNear(text, /소득|도시근로자/)?.match(/(\d{2,3})\s*%/);
  if (pct) {
    criteria.incomePctLimit = Number(pct[1]);
    hasSignal = true;
  }

  // 총자산 한도
  const asset = parseKrwAmount(text, /총?\s*자산/);
  if (asset !== undefined) {
    criteria.assetLimit = asset;
    hasSignal = true;
  }

  // 자동차가액 한도
  const car = parseKrwAmount(text, /자동차/);
  if (car !== undefined) {
    criteria.carLimit = car;
    hasSignal = true;
  }

  // 거주요건 — "(서울|경기|수도권|해당지역) ... N년/개월"
  const resv = text.match(/(서울|경기|수도권|해당지역|인천)[^.]{0,15}?(\d+)\s*(년|개월)/);
  if (resv) {
    const months = resv[3] === "년" ? Number(resv[2]) * 12 : Number(resv[2]);
    criteria.residencyReq = { region: resv[1], months };
    hasSignal = true;
  }

  // 청약통장 — 가입기간/납입횟수
  const savMonths = sliceNear(text, /청약통장|청약저축|가입/)?.match(/(\d+)\s*(년|개월)/);
  const savCount = sliceNear(text, /납입|회차/)?.match(/(\d+)\s*회/);
  if (savMonths || savCount) {
    const months = savMonths
      ? savMonths[2] === "년"
        ? Number(savMonths[1]) * 12
        : Number(savMonths[1])
      : 0;
    criteria.savingsReq = { months, count: savCount ? Number(savCount[1]) : 0 };
    hasSignal = true;
  }

  // 예비신혼 / 생애최초 플래그
  if (/예비\s*신혼/.test(text)) {
    criteria.preNewlywedAllowed = true;
    hasSignal = true;
  }
  if (/생애\s*최초/.test(text)) {
    criteria.firstTimeEligible = true;
    hasSignal = true;
  }

  return hasSignal ? criteria : null;
}
