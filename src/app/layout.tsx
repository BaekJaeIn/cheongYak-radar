import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { RegisterSW } from "@/features/pwa/RegisterSW";
import { BackExitGuard } from "@/features/pwa/BackExitGuard";
import { NotifyToggle } from "@/features/notifications/NotifyToggle";
import { BottomNav } from "@/features/nav/BottomNav";

export const metadata: Metadata = {
  title: "청약레이더 — 우리 가구 맞춤 추천",
  description: "서울·경기 청약/임대 공고를 가구 자격·순위로 자동 추천",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d4ed8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* beforeinstallprompt는 페이지 로드 직후 1회 발생 → React 마운트 전에 가로채 저장.
            (배너가 늦게 마운트되면 이벤트를 놓쳐 '설치'가 안내문으로만 동작하던 문제 해결) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  window.__bipEvent = window.__bipEvent || null;
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    window.__bipEvent = e;
    window.dispatchEvent(new Event('bipchange'));
  });
  window.addEventListener('appinstalled', function(){
    window.__bipEvent = null;
    window.dispatchEvent(new Event('bipchange'));
  });
})();`,
          }}
        />
      </head>
      <body className="min-h-screen pb-16">
        <RegisterSW />
        <BackExitGuard />
        <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
            <Link
              href="/"
              replace
              className="text-lg font-bold text-blue-700"
              data-testid="nav-home"
            >
              청약레이더
            </Link>
            <div className="flex items-center gap-2">
              <NotifyToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-md px-4 py-4">{children}</main>

        <BottomNav />
      </body>
    </html>
  );
}
