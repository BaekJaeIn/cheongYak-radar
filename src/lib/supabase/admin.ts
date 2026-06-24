import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 쓰기(수집 upsert)용 service_role 클라이언트.
// 절대 클라이언트 번들에 포함 금지 — 서버(Edge Function/Route Handler)에서만. (NFR-3)
export function getAdminClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("getAdminClient는 서버에서만 호출해야 합니다 (service_role 노출 금지).");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("Supabase 환경변수 누락: SUPABASE URL / SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}
