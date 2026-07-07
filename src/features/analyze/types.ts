// U7 공고분석 결과 타입 — Edge collect/analyze.ts·recommend/types.ts 미러 (자기완결 미러 선례).
import type { EligibilityCriteria } from "@/lib/types/notice";

export type MatchStatus = "eligible" | "conditional" | "ineligible";

export interface SupplyTypeMatch {
  type: string;
  status: MatchStatus;
  reasons: string[];
}

export interface MatchResult {
  noticeId: string;
  perSupplyType: SupplyTypeMatch[];
  anyEligible: boolean;
}

/** Gemini 구조화 추출 결과 (E-U7-2). 원문에 없는 값은 null. */
export interface ExtractedNotice {
  isNotice: boolean;
  title: string | null;
  regionSido: string | null;
  regionSigu: string | null;
  applyStart: string | null;
  applyEnd: string | null;
  supplyTypes: string[];
  eligibility: EligibilityCriteria;
}

export type AnalyzeErrorCode =
  | "notAnnouncement"
  | "extractFailed"
  | "profileMissing"
  | "geminiUnavailable"
  // /api/analyze에서 추가되는 전송 계층 코드
  | "invalidFile"
  | "tooLarge"
  | "edgeError";

/** 분석 응답 (E-U7-3). 저장하지 않는다 (BR-U7-6). */
export type AnalyzeOutcome =
  | { ok: true; extracted: ExtractedNotice; match: MatchResult; disclaimer: string }
  | { ok: false; code: AnalyzeErrorCode; message: string };
