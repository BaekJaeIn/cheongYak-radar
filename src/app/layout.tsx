import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { RegisterSW } from "@/features/pwa/RegisterSW";
import { NotifyToggle } from "@/features/notifications/NotifyToggle";

export const metadata: Metadata = {
  title: "청약레이더 — 우리 커플 맞춤 추천",
  description: "서울·경기 청약/임대 공고를 우리 자격·순위로 자동 추천",
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
        <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold text-blue-700" data-testid="nav-home">
              청약레이더
            </Link>
            <div className="flex items-center gap-2">
              <NotifyToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-md px-4 py-4">{children}</main>

        <nav className="fixed bottom-0 left-0 right-0 border-t bg-white">
          <div className="mx-auto flex max-w-md">
            <Link href="/" className="flex-1 py-3 text-center text-sm font-medium" data-testid="tab-feed">
              추천
            </Link>
            <Link href="/bookmarks" className="flex-1 py-3 text-center text-sm font-medium" data-testid="tab-bookmarks">
              관심
            </Link>
            <Link href="/settings" className="flex-1 py-3 text-center text-sm font-medium" data-testid="tab-settings">
              내 프로필
            </Link>
          </div>
        </nav>
      </body>
    </html>
  );
}
