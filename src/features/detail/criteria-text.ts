// 자격조건 → 사람이 읽는 문장 (순수, BR-U4-3). 테스트 대상.
import type { EligibilityCriteria } from "@/lib/types/notice";

/** 원 → "1.2억" / "3,800만원" 표기. */
export function formatWon(won: number): string {
  if (won >= 100_000_000) {
    const eok = won / 100_000_000;
    return `${Number.isInteger(eok) ? eok : eok.toFixed(1)}억원`;
  }
  if (won >= 10_000) return `${Math.round(won / 10_000).toLocaleString()}만원`;
  return `${won.toLocaleString()}원`;
}

export function summarizeCriteria(el: EligibilityCriteria | null | undefined): string[] {
  if (!el) return [];
  const lines: string[] = [];
  if (el.incomePctLimit != null) lines.push(`소득 기준 도시근로자 월평균소득의 ${el.incomePctLimit}% 이내`);
  if (el.assetLimit != null) lines.push(`총자산 ${formatWon(el.assetLimit)} 이하`);
  if (el.carLimit != null) lines.push(`자동차가액 ${formatWon(el.carLimit)} 이하`);
  if (el.residencyReq) lines.push(`${el.residencyReq.region} 거주 ${el.residencyReq.months}개월 이상`);
  if (el.savingsReq) lines.push(`청약통장 ${el.savingsReq.count}회·${el.savingsReq.months}개월 이상`);
  if (el.preNewlywedAllowed) lines.push("예비신혼부부 신청 가능");
  if (el.firstTimeEligible) lines.push("생애최초 특별공급 대상");
  return lines;
}
