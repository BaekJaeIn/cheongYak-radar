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
}

export interface FeedResult {
  items: FeedItem[];
  hasMore: boolean;
  total: number;
}
