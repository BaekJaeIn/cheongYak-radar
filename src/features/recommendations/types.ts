import type { Notice } from "@/lib/types/notice";

export interface FeedRec {
  score: number;
  eligibleTypes: string[];
  reasonSummary: string | null;
  scoreBreakdown: Record<string, number> | null;
}

/** 피드 1행: 공고 + 추천 정보 병합. */
export interface FeedItem {
  notice: Notice;
  rec: FeedRec;
}

export type FeedKind = "sale" | "rent";

export interface FeedFilter {
  kind?: FeedKind; // 분양(sale)/임대(rent)/전체(undefined)
  hideExpired: boolean; // 기본 true
  regions?: string[]; // 관심지역(시군구). 설정 시 해당 지역만 노출(먼 경기 제외, v2)
}

export interface FeedResult {
  items: FeedItem[];
  hasMore: boolean;
  total: number;
}
