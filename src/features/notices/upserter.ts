// C5 NoticeUpserter — 쓰기 (service_role, upsert_notices RPC 경유)
// 근거: business-rules.md BR-1(합성키), BR-2(요약/created_at 보존)
// U1 Edge Function에서도 동일 RPC를 호출해 재사용한다.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NoticeInput, SourceType } from "@/lib/types/notice";

export interface UpsertResult {
  inserted: string[]; // 신규 공고 id (U5 push 트리거 대상)
  updated: string[];
}

/** 합성 키 생성: `${source}:${source_no}` (BR-1). */
export function makeNoticeId(source: SourceType, sourceNo: string): string {
  return `${source}:${sourceNo}`;
}

/** NoticeInput → upsert_notices RPC 행. id가 비어 있으면 합성 키로 채운다. */
export function toRpcRow(n: NoticeInput): Record<string, unknown> {
  const id = n.id && n.id.length > 0 ? n.id : makeNoticeId(n.source, n.source_no);
  return {
    id,
    source_no: n.source_no,
    source: n.source,
    title: n.title,
    region_sido: n.region_sido,
    region_sigu: n.region_sigu,
    area_min: n.area_min,
    area_max: n.area_max,
    notice_date: n.notice_date,
    apply_start: n.apply_start,
    apply_end: n.apply_end,
    winner_date: n.winner_date,
    supply_type: n.supply_type,
    newlywed: n.newlywed,
    pre_newlywed: n.pre_newlywed,
    priority: n.priority,
    url: n.url,
    eligibility_summary: n.eligibility_summary ?? null,
    raw: n.raw ?? null,
  };
}

/**
 * 공고 배치를 upsert한다. 충돌 시 요약·created_at 보존(RPC 내부 처리, BR-2).
 * @returns 신규(inserted)/갱신(updated) id 목록.
 */
export async function upsertNotices(
  client: SupabaseClient,
  notices: NoticeInput[],
): Promise<UpsertResult> {
  if (notices.length === 0) return { inserted: [], updated: [] };

  const rows = notices.map(toRpcRow);
  const { data, error } = await client.rpc("upsert_notices", { p: rows });
  if (error) throw new Error(`upsertNotices 실패: ${error.message}`);

  const inserted: string[] = [];
  const updated: string[] = [];
  for (const r of (data ?? []) as { id: string; was_inserted: boolean }[]) {
    (r.was_inserted ? inserted : updated).push(r.id);
  }
  return { inserted, updated };
}
