// 북마크 DB 저장소 (v6 C40, FR-14.4). RLS own-CRUD — 클라이언트에서 anon key + 세션으로 접근.
// BR-U8-8: 최초 로그인 시 localStorage 북마크를 DB로 1회 병합, 성공 시에만 로컬 비움.
import { getBrowserClient } from "@/lib/supabase/browser";
import { BookmarkStore } from "./store";

/** 순수: 로컬 id 중 실제 존재하는 공고만 insert 행으로 (FK 위반 방지, 테스트 대상). */
export function planMergeRows(
  localIds: string[],
  existingNoticeIds: string[],
  userId: string,
): { user_id: string; notice_id: string }[] {
  const existing = new Set(existingNoticeIds);
  return [...new Set(localIds)]
    .filter((id) => existing.has(id))
    .map((id) => ({ user_id: userId, notice_id: id }));
}

/** 내 북마크 공고 id 목록 (RLS가 본인 행으로 한정). */
export async function listBookmarkIds(): Promise<string[]> {
  const { data, error } = await getBrowserClient().from("bookmarks").select("notice_id");
  if (error) throw new Error(`북마크 조회 실패: ${error.message}`);
  return ((data ?? []) as { notice_id: string }[]).map((r) => r.notice_id);
}

export async function isBookmarked(noticeId: string): Promise<boolean> {
  const { data } = await getBrowserClient()
    .from("bookmarks")
    .select("notice_id")
    .eq("notice_id", noticeId)
    .maybeSingle();
  return data !== null;
}

/** 토글 후 북마크 여부 반환. 미로그인(세션 만료)이면 false 유지. */
export async function toggleBookmark(noticeId: string): Promise<boolean> {
  const client = getBrowserClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return false;

  if (await isBookmarked(noticeId)) {
    await client.from("bookmarks").delete().eq("user_id", user.id).eq("notice_id", noticeId);
    return false;
  }
  const { error } = await client
    .from("bookmarks")
    .insert({ user_id: user.id, notice_id: noticeId });
  return !error;
}

/**
 * localStorage 북마크 → DB 1회 병합 (BR-U8-8).
 * 존재하지 않는 공고는 걸러 FK 위반을 막고, 삽입 성공 시에만 로컬을 비운다(유실 방지).
 * 실패하면 로컬을 그대로 두어 다음 방문에 재시도.
 */
export async function mergeLocalOnce(): Promise<void> {
  const local = BookmarkStore.list();
  if (local.length === 0) return;
  const client = getBrowserClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return;

  const { data: noticeRows, error: nErr } = await client
    .from("notices")
    .select("id")
    .in("id", local);
  if (nErr) return;

  const rows = planMergeRows(
    local,
    ((noticeRows ?? []) as { id: string }[]).map((r) => r.id),
    user.id,
  );
  if (rows.length > 0) {
    // update 정책이 없으므로 DO NOTHING(ignoreDuplicates)으로 중복만 건너뜀
    const { error } = await client
      .from("bookmarks")
      .upsert(rows, { onConflict: "user_id,notice_id", ignoreDuplicates: true });
    if (error) return;
  }
  BookmarkStore.clear();
}
