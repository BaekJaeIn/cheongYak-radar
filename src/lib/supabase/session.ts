// 세션 회원 조회 헬퍼 (v6 C39). Route Handler·RSC 공용 — 없으면 null (401 처리는 호출부).
import type { User } from "@supabase/supabase-js";
import { getServerClient } from "./server";

export async function getSessionUser(): Promise<User | null> {
  const { data, error } = await getServerClient().auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}
