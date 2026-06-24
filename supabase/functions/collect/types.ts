// U1 Edge Function 공유 타입 (U2 src/lib/types/notice.ts의 NoticeInput 미러)
// Deno 자기완결성을 위해 별도 정의. 필드는 U2 스키마와 일치해야 함.

export type SourceType = "apt" | "lh" | "sh" | "private";
export type Priority = "1순위" | "2순위" | "무순위";

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
