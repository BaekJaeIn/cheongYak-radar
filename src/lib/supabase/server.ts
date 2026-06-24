import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 서버 컴포넌트(RSC) 조회용 anon 클라이언트.
// anon key는 RLS(notices select-only)로 보호되므로 사용 안전. (Q-A3=A, NFR-3)
let _client: SupabaseClient | null = null;

export function getServerClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Supabase 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  _client = createClient(url, anon, { auth: { persistSession: false } });
  return _client;
}
