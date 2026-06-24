"use client";
// 서비스워커 등록 (BR-U5-4/5). 프로덕션에서만(개발 캐시 혼선 방지).
import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
