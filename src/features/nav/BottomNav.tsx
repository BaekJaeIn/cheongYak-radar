"use client";
// 하단 탭 네비. '추천' 탭은 클릭 시 라우터 캐시를 무효화해 최신 추천을 즉시 반영
// (프로필 변경 → 추천 갱신 후 탭 이동 시 옛 데이터가 보이던 문제 해결).
import { useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Spinner } from "@/features/ui/Spinner";

const TABS = [
  { href: "/", label: "추천", testid: "tab-feed" },
  { href: "/bookmarks", label: "관심", testid: "tab-bookmarks" },
  { href: "/analyze", label: "공고분석", testid: "tab-analyze" },
  { href: "/settings", label: "내 프로필", testid: "tab-settings" },
];

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  // '추천' 탭 새로고침은 router.refresh(소프트 전환)라 loading.tsx가 안 뜸 →
  // useTransition으로 재요청 동안 해당 탭에 스피너 표시.
  const [isPending, startTransition] = useTransition();
  if (pathname === "/login") return null; // 로그인 화면은 탭 숨김 (v6)
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-white">
      <div className="mx-auto flex max-w-md">
        {TABS.map((t) => {
          const active = pathname === t.href;
          const showSpinner = t.href === "/" && isPending;
          return (
            <Link
              key={t.href}
              href={t.href}
              replace
              data-testid={t.testid}
              prefetch={t.href === "/" ? false : undefined}
              onClick={
                t.href === "/"
                  ? (e) => {
                      e.preventDefault();
                      startTransition(() => {
                        router.replace("/");
                        router.refresh(); // 캐시 무효화 → 최신 추천 재요청
                      });
                    }
                  : undefined
              }
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-center text-sm font-medium ${
                active ? "text-blue-700" : "text-gray-600"
              }`}
            >
              {showSpinner && <Spinner size="sm" />}
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
