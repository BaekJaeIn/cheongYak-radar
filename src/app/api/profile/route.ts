// /api/profile — 가구 프로필 GET/PUT (FR-8, US-6.1/6.2).
// service_role은 서버에서만 사용(클라 미노출, NFR-3 / BR-U6-16). 저장 후 재계산 트리거.
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
    // US-6.2: 프로필 변경 → collect Edge Function recompute 액션 트리거.
    // 결과를 응답에 담아 클라가 갱신 성공/실패를 인지(이전엔 비차단이라 "변경 안 됨"처럼 보임).
    const recompute = await triggerRecompute();
    // 추천 갱신 후 피드/관심 페이지 서버 캐시 무효화 (클라는 router.refresh로 보강).
    revalidatePath("/");
    revalidatePath("/bookmarks");
    return NextResponse.json({ profile, recompute });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

interface RecomputeStatus {
  ok: boolean;
  recommended?: number;
  newRecommendations?: number;
  error?: string;
}

/** Supabase Functions 베이스 URL을 절대 URL로 정규화(프로토콜 보정·trailing slash 제거). */
function functionsBaseUrl(): string | null {
  // getAdminClient와 동일하게 NEXT_PUBLIC을 우선(배포 환경에서 검증된 값).
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!url) return null;
  url = url.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`; // 프로토콜 누락 보정
  try {
    return new URL(url).origin; // 유효성 검증 + 경로/쿼리 제거
  } catch {
    return null;
  }
}

/** collect Edge Function에 재계산만 요청(로직 중복 방지, infra §4). 결과/실패를 구조화 반환. */
async function triggerRecompute(): Promise<RecomputeStatus> {
  const base = functionsBaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) {
    return { ok: false, error: "서버 환경변수(SUPABASE URL/SERVICE_ROLE_KEY) 미설정 — 추천 갱신을 건너뜀" };
  }
  try {
    const res = await fetch(`${base}/functions/v1/collect`, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ action: "recompute" }),
    });
    if (!res.ok) {
      return { ok: false, error: `추천 갱신 실패(HTTP ${res.status})` };
    }
    const data = (await res.json().catch(() => ({}))) as {
      recommended?: number;
      newRecommendations?: number;
      skipped?: string;
    };
    return {
      ok: true,
      recommended: data.recommended,
      newRecommendations: data.newRecommendations,
      error: data.skipped, // 예: "프로필 미입력"
    };
  } catch (e) {
    return { ok: false, error: `추천 갱신 트리거 실패: ${(e as Error).message}` };
  }
}
