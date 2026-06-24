// C8 NoticeRepository — 조회 (서버 컴포넌트, anon, RLS select-only)
// 근거: business-logic-model.md, business-rules.md BR-3~5

import type { NoticeFilter, NoticeListResult, Notice, Page } from "@/lib/types/notice";
import { getServerClient } from "@/lib/supabase/server";
import { buildQuery, makeCursor } from "./query-builder";

const DEFAULT_LIMIT = 20;

/**
 * 필터/정렬/커서를 적용해 공고 목록을 조회한다.
 * 정렬: sort_apply_end ASC(마감 임박, NULL은 끝), id ASC (BR-4/BR-5).
 * 모든 조건은 AND 결합. limit+1을 읽어 다음 페이지 존재를 판정한다.
 */
export async function listNotices(
  filter: NoticeFilter,
  page: Page = { limit: DEFAULT_LIMIT },
): Promise<NoticeListResult> {
  const client = getServerClient();
  const built = buildQuery(filter, page.cursor);
  const limit = page.limit ?? DEFAULT_LIMIT;

  let qb = client.from("notices").select("*");

  for (const c of built.eq) qb = qb.eq(c.column, c.value);
  for (const c of built.in) qb = qb.in(c.column, c.values);
  if (built.areaGte) qb = qb.gte(built.areaGte.column, built.areaGte.value);
  if (built.areaLte) qb = qb.lte(built.areaLte.column, built.areaLte.value);
  // 각 .or()는 서로 AND 결합 (PostgREST 규칙) → BR-3 전체 AND와 일치
  if (built.regionOr) qb = qb.or(built.regionOr);
  if (built.hideExpiredOr) qb = qb.or(built.hideExpiredOr);
  if (built.cursorOr) qb = qb.or(built.cursorOr);
  for (const o of built.order) {
    qb = qb.order(o.column, { ascending: o.ascending, nullsFirst: o.nullsFirst });
  }
  qb = qb.limit(limit + 1);

  const { data, error } = await qb;
  if (error) throw new Error(`listNotices 실패: ${error.message}`);

  const rows = (data ?? []) as Notice[];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? makeCursor(items[items.length - 1] as never) : undefined;

  return { items, nextCursor };
}

/** 단건 조회 (합성 키). 없으면 null. */
export async function getNoticeById(id: string): Promise<Notice | null> {
  const client = getServerClient();
  const { data, error } = await client.from("notices").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getNoticeById 실패: ${error.message}`);
  return (data as Notice | null) ?? null;
}
