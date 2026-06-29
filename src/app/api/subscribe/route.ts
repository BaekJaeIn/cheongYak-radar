// /api/subscribe — Web Push 구독 등록 (US-5.4, BR-U5-6).
// service_role(서버 전용)로 INSERT — anon RLS INSERT 정책이 새 API 키 체계에서
// 동작하지 않아 구독이 저장되지 않던 문제 해결. 키는 클라에 노출되지 않음(NFR-3).
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { endpoint, p256dh, auth } = await req.json();
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "구독 정보 누락" }, { status: 400 });
    }
    const client = getAdminClient();
    const { error } = await client
      .from("push_subscriptions")
      .upsert({ endpoint, p256dh, auth }, { onConflict: "endpoint" });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
