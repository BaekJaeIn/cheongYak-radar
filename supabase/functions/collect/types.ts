// U1 Edge Function 공유 타입 (U2 src/lib/types/notice.ts의 NoticeInput 미러)
// Deno 자기완결성을 위해 별도 정의. 필드는 U2 스키마와 일치해야 함.

export type SourceType = "apt" | "lh" | "sh" | "gh" | "private";
export type Priority = "1순위" | "2순위" | "무순위";

/**
 * 공고별 구조화 자격조건 (notices.eligibility JSONB 적재). v2 — FR-9 입력.
 * src/lib/types/notice.ts의 EligibilityCriteria 미러 (Deno 자기완결성).
 * CriteriaExtractor가 베스트에포트로 채우므로 모든 필드는 선택적.
 */
export interface EligibilityCriteria {
  supplyTypes: string[];
  incomePctLimit?: number; // 도시근로자 월평균소득 대비 한도(%)
  assetLimit?: number; // 총자산 한도(원)
  carLimit?: number; // 자동차가액 한도(원)
  residencyReq?: { region: string; months: number };
  savingsReq?: { months: number; count: number };
  preNewlywedAllowed?: boolean;
  firstTimeEligible?: boolean;
}

export interface NoticeInput {
  id: string;
  source_no: string;
  source: SourceType;
  title: string;
  region_sido: string | null;
  region_sigu: string | null;
  area_min: number | null;
  area_max: number | null;
  notice_date: string | null;
  apply_start: string | null;
  apply_end: string | null;
  winner_date: string | null;
  supply_type: string | null;
  newlywed: boolean;
  pre_newlywed: boolean;
  priority: Priority | null;
  url: string | null;
  eligibility_summary?: string | null;
  eligibility?: EligibilityCriteria | null; // CriteriaExtractor 결과 (v2)
  raw: unknown;
}

/** 소스 Collector 공통 계약 (C1). */
export interface Collector {
  readonly source: SourceType;
  collect(): Promise<NoticeInput[]>;
}

/** 합성 키 (BR-U1-1, U2 BR-1과 동일 규칙). */
export function makeNoticeId(source: SourceType, sourceNo: string): string {
  return `${source}:${sourceNo}`;
}
