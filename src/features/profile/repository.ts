// C25 ProfileRepository — 가구 프로필 1건 (FR-8). service_role(서버 전용, BR-U6-16).
import { getAdminClient } from "@/lib/supabase/admin";
import type { HouseholdProfile } from "@/lib/types/profile";

/** 단일 가구 프로필 조회. 없으면 null(최초 미입력). */
export async function getProfile(): Promise<HouseholdProfile | null> {
  const client = getAdminClient();
  const { data, error } = await client
    .from("household_profile")
    .select("profile")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`프로필 조회 실패: ${error.message}`);
  return (data?.profile as HouseholdProfile | undefined) ?? null;
}

/** 프로필 저장(단일행 보장 RPC). */
export async function saveProfile(profile: HouseholdProfile): Promise<HouseholdProfile> {
  const client = getAdminClient();
  const { data, error } = await client.rpc("upsert_household_profile", { p: profile });
  if (error) throw new Error(`프로필 저장 실패: ${error.message}`);
  const row = data as { profile: HouseholdProfile } | null;
  return row?.profile ?? profile;
}
