"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 브라우저용 anon 클라이언트(RLS read). 북마크 목록 조회 등 클라이언트 사용.
let _client: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  _client = createClient(url, anon, { auth: { persistSession: false } });
  return _client;
}
