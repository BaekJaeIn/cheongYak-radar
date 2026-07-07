// RecommendationService (S6) — 재계산 오케스트레이션 (BR-U6-13~15 + v6 BR-U8-6 회원별).
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
  /** 회원별 신규 추천 — 회원별 푸시 라우팅용 (v6 BR-U8-7) */
  newIdsByUser: Record<string, string[]>;
  skipped?: string;
}

/** upsert RPC 결과에서 신규 추천 id만 추출 (순수, 테스트 대상). */
export function collectNewIds(
  upserted: { notice_id: string; was_inserted: boolean }[] | null | undefined,
): string[] {
  const out: string[] = [];
  for (const r of upserted ?? []) {
    if (r.was_inserted) out.push(r.notice_id);
  }
  return out;
}

/**
 * 회원별 재계산: 프로필 보유 회원(전원 또는 userId 1명) × 서울·경기 공고 → 자격·점수 →
 * recommendations upsert/prune. 회원 간 격리 — 한 회원 실패가 다른 회원을 막지 않는다 (BR-U8-6).
 */
export async function recompute(client: SupabaseClient, userId?: string): Promise<RecomputeResult> {
  const today = todayKST();

  // 프로필 보유 회원 로드 (user_id 없는 레거시 행은 귀속 전 — 제외)
  let profQuery = client
    .from("household_profile")
    .select("user_id, profile")
    .not("user_id", "is", null);
  if (userId) profQuery = profQuery.eq("user_id", userId);
  const { data: profRows, error: profErr } = await profQuery;
  if (profErr) throw new Error(`프로필 조회 실패: ${profErr.message}`);
  const profiles = (profRows ?? []) as { user_id: string; profile: HouseholdProfile }[];
  if (profiles.length === 0) {
    return {
      recommended: 0,
      newRecommendations: 0,
      newIds: [],
      newIdsByUser: {},
      skipped: "프로필 미입력",
    };
  }

  // 대상 공고 (서울·경기, 미마감 우선) — 회원 간 공유 1회 조회
  const { data: noticeRows, error: nErr } = await client
    .from("notices")
    .select("*")
    .or(`apply_end.is.null,apply_end.gte.${today}`)
    .limit(2000);
  if (nErr) throw new Error(`공고 조회 실패: ${nErr.message}`);
  const notices = (noticeRows ?? []) as unknown as NoticeInput[];

  const table = loadCriteriaTable(new Date(today).getFullYear());

  let recommended = 0;
  const newIdsByUser: Record<string, string[]> = {};

  for (const { user_id, profile } of profiles) {
    try {
      // 공고 단위 격리 평가 (한 건 실패가 전체를 막지 않음)
      const matches: MatchResult[] = [];
      for (const n of notices) {
        try {
          matches.push(evaluate(n, profile, table, today));
        } catch (e) {
          console.warn(`[recommend] 평가 실패 ${user_id}/${n.id}: ${(e as Error).message}`);
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
      const { data: upData, error: upErr } = await client.rpc("upsert_recommendations", {
        p: rows,
        p_user_id: user_id,
      });
      if (upErr) throw new Error(`추천 저장 실패: ${upErr.message}`);

      const newIds = collectNewIds(
        upData as { notice_id: string; was_inserted: boolean }[] | null,
      );
      if (newIds.length > 0) newIdsByUser[user_id] = newIds;

      // 탈락 정리 (회원 스코프)
      const keepIds = recs.map((r) => r.noticeId);
      const { error: prErr } = await client.rpc("prune_recommendations", {
        keep_ids: keepIds,
        p_user_id: user_id,
      });
      if (prErr) console.warn(`[recommend] prune 실패(무시) ${user_id}: ${prErr.message}`);

      recommended += recs.length;
    } catch (e) {
      // 회원 간 격리 (BR-U8-6)
      console.warn(`[recommend] 회원 재계산 실패 ${user_id}: ${(e as Error).message}`);
    }
  }

  const newIds = Object.values(newIdsByUser).flat();
  return { recommended, newRecommendations: newIds.length, newIds, newIdsByUser };
}
