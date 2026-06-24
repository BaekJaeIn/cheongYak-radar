// U2 upsert_notices RPC 호출 (service_role). U2 BR-2 정책(요약/created_at 보존)은 RPC 내부.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { NoticeInput } from "./types.ts";

export interface UpsertResult {
  inserted: string[]; // 신규 id → U5 push 트리거
  updated: string[];
}

export async function upsertNotices(
  client: SupabaseClient,
  notices: NoticeInput[],
): Promise<UpsertResult> {
  if (notices.length === 0) return { inserted: [], updated: [] };

  const { data, error } = await client.rpc("upsert_notices", { p: notices });
  if (error) throw new Error(`upsert_notices 실패: ${error.message}`);

  const inserted: string[] = [];
  const updated: string[] = [];
  for (const r of (data ?? []) as { id: string; was_inserted: boolean }[]) {
    (r.was_inserted ? inserted : updated).push(r.id);
  }
  return { inserted, updated };
}
