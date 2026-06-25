"use client";
// 알림 구독 토글 (C24, US-5.4).
import { useEffect, useState } from "react";
import { subscribe, unsubscribe, currentPermission, pushSupported } from "./push-client";

export function NotifyToggle() {
  const [state, setState] = useState<NotificationPermission | "unsupported" | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    currentPermission().then(setState);
  }, []);

  if (state === "loading") {
    return <span className="text-xs text-gray-400" data-testid="notify-loading">알림 확인 중…</span>;
  }
  if (state === "unsupported") {
    return <p className="text-xs text-gray-400" data-testid="notify-unsupported">이 기기는 알림을 지원하지 않아요.</p>;
  }

  async function onEnable() {
    setBusy(true);
    setError("");
    try {
      const ok = await subscribe();
      if (ok) {
        setState("granted");
      } else {
        const perm = (await currentPermission()) as NotificationPermission;
        setState(perm);
        if (perm !== "granted") setError("알림 권한이 필요해요(브라우저에서 허용).");
      }
    } catch (e) {
      setError(`알림 설정 실패: ${(e as Error).message}`);
    } finally {
      setBusy(false); // 실패해도 버튼이 영구 비활성되지 않도록 보장
    }
  }
  async function onDisable() {
    setBusy(true);
    try {
      await unsubscribe();
      setState("default");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2 text-xs" data-testid="notify-toggle">
      {state === "granted" ? (
        <>
          <span className="text-green-700">알림 켜짐</span>
          <button onClick={onDisable} disabled={busy} className="text-gray-500 underline">
            끄기
          </button>
        </>
      ) : state === "denied" ? (
        <span className="text-gray-400">알림이 차단됨(브라우저 설정에서 허용)</span>
      ) : (
        <button
          onClick={onEnable}
          disabled={busy}
          className="rounded bg-blue-600 px-2 py-1 font-medium text-white disabled:opacity-50"
        >
          {busy ? "설정 중…" : "새 추천 알림 받기"}
        </button>
      )}
      {error && <span className="text-red-500">{error}</span>}
    </div>
  );
}
