// C25 ProfileRepository — 회원별 가구 프로필 (v6 FR-14.1, BR-U8-5).
// service_role + 명시적 user_id 스코프 (호출부(API)가 세션 검증, BR-U8-11).
import { getAdminClient } from "@/lib/supabase/admin";
import type { HouseholdProfile } from "@/lib/types/profile";

/** 회원 프로필 조회. 없으면 null(최초 미입력). */
export async function getProfile(userId: string): Promise<HouseholdProfile | null> {
  const client = getAdminClient();
  const { data, error } = await client
    .from("household_profile")
    .select("profile")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`프로필 조회 실패: ${error.message}`);
  return (data?.profile as HouseholdProfile | undefined) ?? null;
}

/** 회원 프로필 저장(회원당 1행 보장 RPC). */
export async function saveProfile(
  userId: string,
  profile: HouseholdProfile,
): Promise<HouseholdProfile> {
  const client = getAdminClient();
  const { data, error } = await client.rpc("upsert_household_profile", {
    p: profile,
    p_user_id: userId,
  });
  if (error) throw new Error(`프로필 저장 실패: ${error.message}`);
  const row = data as { profile: HouseholdProfile } | null;
  return row?.profile ?? profile;
}
