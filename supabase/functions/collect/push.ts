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

/** 테스트용: 신규추천 여부와 무관하게 전체 구독자에게 무조건 발송.
 *  최상위 추천 공고 1건을 샘플로 보내 제목 표시 + 클릭→상세 이동을 함께 검증. */
export async function dispatchTest(client: SupabaseClient): Promise<{ sent: number; failed: number }> {
  if (!configureVapid()) return { sent: 0, failed: 0 };

  // 최상위 추천 1건 조회 (제목·상세 링크 샘플)
  const { data: rec } = await client
    .from("recommendations")
    .select("notice_id, notices(title)")
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();
  const noticeId = (rec as { notice_id?: string } | null)?.notice_id;
  const title = (rec as { notices?: { title?: string } } | null)?.notices?.title;

  const payload = noticeId && title
    ? JSON.stringify({
        title: `🏠 ${title}`,
        body: "알림 테스트 · 눌러서 상세 보기",
        url: `/notice/${encodeURIComponent(noticeId)}`,
      })
    : JSON.stringify({
        title: "🔔 청약레이더 알림 테스트",
        body: "푸시 알림이 정상 동작합니다",
        url: "/",
      });
  return sendToAll(client, payload);
}

/** 신규추천 newIds가 있으면 전체 구독자에 Web Push 발송. 실패/만료는 개별 정리. */
export async function dispatch(client: SupabaseClient, newIds: string[]): Promise<{ sent: number; failed: number }> {
  if (newIds.length === 0) return { sent: 0, failed: 0 };
  if (!configureVapid()) return { sent: 0, failed: 0 };

  // 신규 추천 공고 제목 조회 (알림 본문/클릭 이동용). 과다 알림 방지 상한.
  const CAP = 5;
  const ids = newIds.slice(0, CAP);
  const { data: noticeRows } = await client
    .from("notices")
    .select("id, title")
    .in("id", ids);
  const titleById = new Map(
    ((noticeRows ?? []) as { id: string; title: string }[]).map((n) => [n.id, n.title]),
  );

  // 공고별 payload: 제목 노출 + 클릭 시 해당 공고 상세로 이동.
  const payloads = ids.map((id) =>
    JSON.stringify({
      title: `🏠 ${titleById.get(id) ?? "새 맞춤 청약 공고"}`,
      body: "새로 추천된 청약 공고예요 · 눌러서 상세 보기",
      url: `/notice/${encodeURIComponent(id)}`,
    })
  );

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
    let dead = false;
    for (const payload of payloads) {
      if (dead) break;
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
          dead = true; // 만료 구독 — 이 구독에 더 보내지 않음
        } else {
          console.warn(`[push] 발송 실패: ${(e as Error).message}`);
        }
      }
    }
  }
  console.log(`[push] notices=${ids.length} sent=${sent} failed=${failed}`);
  return { sent, failed };
}
