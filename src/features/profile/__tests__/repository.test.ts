// v6 BR-U8-5 회귀 가드: 프로필 조회/저장이 반드시 user_id로 스코프되는지 검증 (mock client).
import { describe, it, expect, vi, beforeEach } from "vitest";

const calls: { rpc: unknown[]; eq: unknown[] } = { rpc: [], eq: [] };

vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: (...args: unknown[]) => {
          calls.eq.push(args);
          return { maybeSingle: async () => ({ data: null, error: null }) };
        },
      }),
    }),
    rpc: async (...args: unknown[]) => {
      calls.rpc.push(args);
      return { data: null, error: null };
    },
  }),
}));

import { getProfile, saveProfile } from "@/features/profile/repository";
import type { HouseholdProfile } from "@/lib/types/profile";

const UID = "00000000-0000-0000-0000-000000000001";

beforeEach(() => {
  calls.rpc = [];
  calls.eq = [];
});

describe("ProfileRepository 회원 스코프 (v6 BR-U8-5)", () => {
  it("getProfile은 user_id로 조회", async () => {
    await getProfile(UID);
    expect(calls.eq).toEqual([["user_id", UID]]);
  });
  it("saveProfile은 RPC에 p_user_id 전달", async () => {
    const profile = {} as HouseholdProfile;
    await saveProfile(UID, profile);
    expect(calls.rpc).toEqual([["upsert_household_profile", { p: profile, p_user_id: UID }]]);
  });
});
