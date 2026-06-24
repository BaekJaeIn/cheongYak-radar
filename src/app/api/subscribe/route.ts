// /api/subscribe — Web Push 구독 등록 (US-5.4, BR-U5-6). anon INSERT(push_subscriptions, 0002).
import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { endpoint, p256dh, auth } = await req.json();
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "구독 정보 누락" }, { status: 400 });
    }
    const client = getServerClient();
    const { error } = await client
      .from("push_subscriptions")
      .upsert({ endpoint, p256dh, auth }, { onConflict: "endpoint" });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
