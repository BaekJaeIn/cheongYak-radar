"use client";
// 브라우저 세션 클라이언트 (v6 C39) — @supabase/ssr 쿠키 세션.
// 로그인 회원의 JWT로 요청 → RLS가 본인 행만 허용 (BR-U8-4).
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  _client = createBrowserClient(url, anon);
  return _client;
}
