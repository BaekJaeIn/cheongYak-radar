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
