// /api/profile — 가구 프로필 GET/PUT (FR-8, US-6.1/6.2).
// service_role은 서버에서만 사용(클라 미노출, NFR-3 / BR-U6-16). 저장 후 재계산 트리거.
import { NextResponse } from "next/server";
import { getProfile, saveProfile } from "@/features/profile/repository";
import type { HouseholdProfile } from "@/lib/types/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = await getProfile();
    return NextResponse.json({ profile });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as HouseholdProfile;
    const profile = await saveProfile(body);
    // US-6.2: 프로필 변경 → collect Edge Function recompute 액션 트리거(비차단)
    await triggerRecompute();
    return NextResponse.json({ profile });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** collect Edge Function에 재계산만 요청(로직 중복 방지, infra §4). 실패는 비차단. */
async function triggerRecompute(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/functions/v1/collect`, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ action: "recompute" }),
    });
  } catch (e) {
    console.warn("recompute 트리거 실패(무시):", (e as Error).message);
  }
}
