"use client";
// Web Push 구독 (C11, US-5.4, BR-U5-6). 브라우저.

/** VAPID base64url → Uint8Array (applicationServerKey). */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * 서비스워커 등록 보장(idempotent). RegisterSW는 prod에서만 자동 등록하므로,
 * 알림 구독 시점에 직접 등록해 dev/프로덕션 모두 동작하게 한다(없으면 ready가 멈춤).
 */
async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  const reg = existing ?? (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready; // active 상태까지 대기
  return reg;
}

/** 권한 요청 + 구독 + 서버 등록. 성공 시 true. */
export async function subscribe(): Promise<boolean> {
  if (!pushSupported()) return false;
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid) return false;

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;

  const reg = await ensureServiceWorker();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
  });

  const json = sub.toJSON();
  const res = await fetch("/api/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    }),
  });
  return res.ok;
}

export async function unsubscribe(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  await sub?.unsubscribe();
}

export async function currentPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}
