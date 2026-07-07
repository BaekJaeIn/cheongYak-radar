// 서버(RSC·Route Handler) 세션 클라이언트 (v6 C39) — 요청 쿠키의 세션으로 RLS 적용.
// 세션 쿠키 갱신은 middleware.ts가 담당 — RSC에서는 쿠키 쓰기가 불가해 무시한다.
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export function getServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Supabase 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  const store = cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // RSC 렌더 중에는 쿠키 쓰기 불가 — 미들웨어가 세션을 갱신하므로 무시
        }
      },
    },
  });
}
