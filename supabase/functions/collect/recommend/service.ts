// RecommendationService (S6) — 재계산 오케스트레이션 (BR-U6-13~15). Deno, service_role.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { NoticeInput } from "../types.ts";
import { evaluate, todayKST } from "./matcher.ts";
import { rank } from "./scorer.ts";
import { loadCriteriaTable } from "./criteria-2026.ts";
import type { HouseholdProfile, MatchResult, Recommendation } from "./types.ts";

export interface RecomputeResult {
  recommended: number;
  newRecommendations: number;
  newIds: string[];
  skipped?: string;
}

/** 전체 재계산: 프로필 + 서울·경기 공고 → 자격·점수 → recommendations upsert/prune. */
export async function recompute(client: SupabaseClient): Promise<RecomputeResult> {
  const today = todayKST();

  // 프로필 로드 (없으면 no-op)
  const { data: profRow, error: profErr } = await client
    .from("household_profile")
    .select("profile")
    .eq("id", 1)
    .maybeSingle();
  if (profErr) throw new Error(`프로필 조회 실패: ${profErr.message}`);
  if (!profRow?.profile) {
    return { recommended: 0, newRecommendations: 0, newIds: [], skipped: "프로필 미입력" };
  }
  const profile = profRow.profile as HouseholdProfile;

  // 대상 공고 (서울·경기, 미마감 우선)
  const { data: noticeRows, error: nErr } = await client
    .from("notices")
    .select("*")
    .or(`apply_end.is.null,apply_end.gte.${today}`)
    .limit(2000);
  if (nErr) throw new Error(`공고 조회 실패: ${nErr.message}`);
  const notices = (noticeRows ?? []) as unknown as NoticeInput[];

  const table = loadCriteriaTable(new Date(today).getFullYear());

  // 공고 단위 격리 평가 (한 건 실패가 전체를 막지 않음)
  const matches: MatchResult[] = [];
  for (const n of notices) {
    try {
      matches.push(evaluate(n, profile, table, today));
    } catch (e) {
      console.warn(`[recommend] 평가 실패 ${n.id}: ${(e as Error).message}`);
    }
  }

  const recs: Recommendation[] = rank(matches, notices, profile, undefined, today);

  // 영속화 (firstRecommendedAt 보존, was_inserted 반환)
  const rows = recs.map((r) => ({
    notice_id: r.noticeId,
    score: r.score,
    eligible_types: r.eligibleTypes,
    reason_summary: r.reasonSummary,
    score_breakdown: r.scoreBreakdown,
  }));
  const { data: upData, error: upErr } = await client.rpc("upsert_recommendations", { p: rows });
  if (upErr) throw new Error(`추천 저장 실패: ${upErr.message}`);

  const newIds: string[] = [];
  for (const r of (upData ?? []) as { notice_id: string; was_inserted: boolean }[]) {
    if (r.was_inserted) newIds.push(r.notice_id);
  }

  // 탈락 정리
  const keepIds = recs.map((r) => r.noticeId);
  const { error: prErr } = await client.rpc("prune_recommendations", { keep_ids: keepIds });
  if (prErr) console.warn(`[recommend] prune 실패(무시): ${prErr.message}`);

  return { recommended: recs.length, newRecommendations: newIds.length, newIds };
}
