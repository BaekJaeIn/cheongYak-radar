// PushDispatcher (C7) — 신규추천 Web Push 발송 (US-6.7, BR-U5-8~10). Deno, service_role + VAPID.
import webpush from "npm:web-push@3.6.7";
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

interface SubRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function configureVapid(): boolean {
  const pub = Deno.env.get("VAPID_PUBLIC_KEY") ?? Deno.env.get("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  const priv = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) {
    console.warn("[push] VAPID 키 미설정 — 발송 건너뜀");
    return false;
  }
  webpush.setVapidDetails("mailto:admin@cheongyak-radar.app", pub, priv);
  return true;
}

/** 전체 구독자에게 임의 payload를 발송(공통). 실패/만료는 개별 정리. */
async function sendToAll(
  client: SupabaseClient,
  payload: string,
): Promise<{ sent: number; failed: number }> {
  const { data, error } = await client
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");
  if (error) {
    console.warn(`[push] 구독 조회 실패: ${error.message}`);
    return { sent: 0, failed: 0 };
  }
  let sent = 0;
  let failed = 0;
  for (const s of (data ?? []) as SubRow[]) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
      sent++;
    } catch (e) {
      failed++;
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        await client.from("push_subscriptions").delete().eq("id", s.id);
      } else {
        console.warn(`[push] 발송 실패: ${(e as Error).message}`);
      }
    }
  }
  console.log(`[push] sent=${sent} failed=${failed}`);
  return { sent, failed };
}

/** 테스트용: 신규추천 여부와 무관하게 전체 구독자에게 무조건 발송. */
export async function dispatchTest(client: SupabaseClient): Promise<{ sent: number; failed: number }> {
  if (!configureVapid()) return { sent: 0, failed: 0 };
  const now = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
  const payload = JSON.stringify({
    title: "🔔 청약레이더 알림 테스트",
    body: `푸시 알림이 정상 동작합니다 (${now})`,
    url: "/",
  });
  return sendToAll(client, payload);
}

/** 신규추천 newIds가 있으면 전체 구독자에 Web Push 발송. 실패/만료는 개별 정리. */
export async function dispatch(client: SupabaseClient, newIds: string[]): Promise<{ sent: number; failed: number }> {
  if (newIds.length === 0) return { sent: 0, failed: 0 };
  if (!configureVapid()) return { sent: 0, failed: 0 };

  const { data, error } = await client
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");
  if (error) {
    console.warn(`[push] 구독 조회 실패: ${error.message}`);
    return { sent: 0, failed: 0 };
  }

  const payload = JSON.stringify({
    title: "새 맞춤 청약 공고",
    body: `${newIds.length}건의 새 추천이 있어요`,
    url: "/",
  });

  let sent = 0;
  let failed = 0;
  for (const s of (data ?? []) as SubRow[]) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
      sent++;
    } catch (e) {
      failed++;
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        // 만료 구독 정리
        await client.from("push_subscriptions").delete().eq("id", s.id);
      } else {
        console.warn(`[push] 발송 실패: ${(e as Error).message}`);
      }
    }
  }
  console.log(`[push] sent=${sent} failed=${failed}`);
  return { sent, failed };
}
