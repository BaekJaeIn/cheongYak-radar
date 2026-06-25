"use client";
// 앱 설치 배너 (US-5.3). 항상 노출되는 설치 버튼.
// - 안드로이드/크롬: layout의 조기 캡처(window.__bipEvent)로 받아둔 beforeinstallprompt를 즉시 prompt()
// - 아이폰 Safari: 이벤트 미발생 → '공유 → 홈 화면에 추가' 안내
// - 이미 설치(standalone)/사용자 닫음: 숨김
import { useEffect, useState } from "react";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

declare global {
  interface Window {
    __bipEvent: BIPEvent | null;
  }
}

const DISMISS_KEY = "install-banner-dismissed";

export function InstallBanner() {
  const [canInstall, setCanInstall] = useState(false); // 네이티브 설치 가능(이벤트 보유)
  const [hidden, setHidden] = useState(true); // SSR/초기엔 숨김(깜빡임 방지)
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    setHidden(standalone || dismissed);

    // 조기 캡처된 이벤트가 이미 있으면 즉시 설치 가능
    setCanInstall(!!window.__bipEvent);

    const onChange = () => {
      setCanInstall(!!window.__bipEvent);
      if (!window.__bipEvent) setHidden(true); // appinstalled
    };
    window.addEventListener("bipchange", onChange);
    return () => window.removeEventListener("bipchange", onChange);
  }, []);

  if (hidden) return null;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIos = /iphone|ipad|ipod/i.test(ua);

  const handleInstall = async () => {
    const bip = typeof window !== "undefined" ? window.__bipEvent : null;
    if (bip) {
      await bip.prompt();
      const res = await bip.userChoice;
      window.__bipEvent = null;
      setCanInstall(false);
      if (res.outcome === "accepted") setHidden(true);
    } else {
      setShowHelp((v) => !v); // iOS 또는 설치 이벤트 없음 → 수동 안내 토글
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
  };

  return (
    <div
      className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3"
      data-testid="install-banner"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden>📱</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-blue-900">홈 화면에 앱 추가</p>
          <p className="text-xs text-blue-700">
            설치하면 앱처럼 빠르게 열고 새 추천 알림을 받을 수 있어요.
          </p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-bold text-white"
          data-testid="install-button"
        >
          설치
        </button>
        <button
          onClick={dismiss}
          aria-label="닫기"
          className="shrink-0 px-1 text-lg leading-none text-blue-400"
        >
          ×
        </button>
      </div>

      {/* 네이티브 설치가 불가능한 환경에서만(이벤트 없음) 수동 안내 노출 */}
      {showHelp && !canInstall && (
        <div className="mt-2 rounded-lg bg-white/70 p-2 text-xs text-blue-900" data-testid="install-help">
          {isIos ? (
            <>
              <b>아이폰 Safari</b>: 하단 <b>공유 버튼</b>(□↑) → <b>‘홈 화면에 추가’</b> 를 누르세요.
            </>
          ) : (
            <>
              브라우저 <b>메뉴(⋮)</b> → <b>‘앱 설치’</b> 또는 <b>‘홈 화면에 추가’</b> 를 누르세요.
            </>
          )}
        </div>
      )}
    </div>
  );
}
