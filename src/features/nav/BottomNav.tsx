"use client";
// 하단 탭 네비. '추천' 탭은 클릭 시 라우터 캐시를 무효화해 최신 추천을 즉시 반영
// (프로필 변경 → 추천 갱신 후 탭 이동 시 옛 데이터가 보이던 문제 해결).
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { href: "/", label: "추천", testid: "tab-feed" },
  { href: "/bookmarks", label: "관심", testid: "tab-bookmarks" },
  { href: "/settings", label: "내 프로필", testid: "tab-settings" },
];

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-white">
      <div className="mx-auto flex max-w-md">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            data-testid={t.testid}
            prefetch={t.href === "/" ? false : undefined}
            onClick={
              t.href === "/"
                ? (e) => {
                    e.preventDefault();
                    router.push("/");
                    router.refresh(); // 캐시 무효화 → 최신 추천 재요청
                  }
                : undefined
            }
            className={`flex-1 py-3 text-center text-sm font-medium ${
              pathname === t.href ? "text-blue-700" : "text-gray-600"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
