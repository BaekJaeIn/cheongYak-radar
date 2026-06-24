// 추천 피드 read 모델 (BR-U3-1, Q-FU3-1=A). anon RLS read.
import type { Notice } from "@/lib/types/notice";
import { getServerClient } from "@/lib/supabase/server";
import { todayKST } from "@/features/notices/query-builder";
import { passesFilter } from "./feed-filter";
import type { FeedFilter, FeedItem, FeedRec, FeedResult } from "./types";

const FETCH_CAP = 500; // 개인앱 규모 — 점수순 상위 캡 후 JS 필터

interface Row {
  notice_id: string;
  score: number;
  eligible_types: string[] | null;
  reason_summary: string | null;
  score_breakdown: Record<string, number> | null;
  notice: Notice | null;
}

/**
 * 추천 피드 조회: recommendations(score desc) ⨝ notices, 보조 필터 적용.
 * 점진적 더보기: limit까지 반환 + hasMore.
 */
export async function getRecommendationFeed(
  filter: FeedFilter,
  limit = 20,
  today: string = todayKST(),
): Promise<FeedResult> {
  const client = getServerClient();
  const { data, error } = await client
    .from("recommendations")
    .select(
      "notice_id, score, eligible_types, reason_summary, score_breakdown, notice:notices(*)",
    )
    .order("score", { ascending: false })
    .order("notice_id", { ascending: true })
    .limit(FETCH_CAP);
  if (error) throw new Error(`추천 피드 조회 실패: ${error.message}`);

  const all: FeedItem[] = ((data ?? []) as unknown as Row[])
    .filter((r) => r.notice)
    .map((r) => ({
      notice: r.notice as Notice,
      rec: {
        score: Number(r.score),
        eligibleTypes: r.eligible_types ?? [],
        reasonSummary: r.reason_summary,
        scoreBreakdown: r.score_breakdown,
      },
    }));

  const filtered = all.filter((it) => passesFilter(it.notice, filter, today));
  return {
    items: filtered.slice(0, limit),
    hasMore: filtered.length > limit,
    total: filtered.length,
  };
}

/** 단건 추천 조회(상세 화면용, U4). 없으면 null. */
export async function getRecommendationFor(noticeId: string): Promise<FeedRec | null> {
  const client = getServerClient();
  const { data, error } = await client
    .from("recommendations")
    .select("score, eligible_types, reason_summary, score_breakdown")
    .eq("notice_id", noticeId)
    .maybeSingle();
  if (error) throw new Error(`추천 조회 실패: ${error.message}`);
  if (!data) return null;
  return {
    score: Number(data.score),
    eligibleTypes: data.eligible_types ?? [],
    reasonSummary: data.reason_summary,
    scoreBreakdown: data.score_breakdown,
  };
}
