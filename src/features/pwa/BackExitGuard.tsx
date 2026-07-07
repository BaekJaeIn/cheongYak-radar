"use client";
// 뒤로가기 2회 = 앱 종료 (v7 FR-16). 설치형(PWA standalone)에서만 개입 — 브라우저 탭은 그대로.
// 동작: 앱 내 이동이 전부 replace라 히스토리는 [시작 엔트리, 트랩] 2칸 고정.
// 뒤로 1회 → 시작 화면으로 이동 + 안내 토스트 + 트랩 재장전, 2초 내 1회 더 → 시작 엔트리
// 아래로 내려가 OS가 앱을 종료한다.
import { useEffect, useRef, useState } from "react";

export const EXIT_WINDOW_MS = 2000;

/** 순수: 직전 뒤로가기로부터 2초 내의 재입력인지 (테스트 대상). */
export function isSecondPress(lastMs: number, nowMs: number): boolean {
  return nowMs - lastMs < EXIT_WINDOW_MS;
}

export function BackExitGuard() {
  const lastBack = useRef(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(display-mode: standalone)").matches) return;
    // 트랩 엔트리 — Next 내부 상태를 복제해 라우터가 구분하지 못하게 유지
    window.history.pushState(window.history.state, "");
    const onPop = () => {
      if (isSecondPress(lastBack.current, Date.now())) {
        window.history.back(); // 시작 엔트리 아래 = 앱 종료
        return;
      }
      lastBack.current = Date.now();
      setVisible(true);
      window.setTimeout(() => setVisible(false), EXIT_WINDOW_MS);
      window.history.pushState(window.history.state, ""); // 트랩 재장전
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (!visible) return null;
  return (
    <div
      className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-gray-900/90 px-4 py-2 text-xs text-white"
      data-testid="back-exit-toast"
    >
      뒤로가기를 한 번 더 누르면 앱이 종료돼요
    </div>
  );
}
