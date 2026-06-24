"use client";
// 관심 공고 `/bookmarks` (C22, US-5.2). localStorage ids → anon 조회, 마감정렬·만료흐림.
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Notice } from "@/lib/types/notice";
import { BookmarkStore } from "@/features/bookmarks/store";
import { getBrowserClient } from "@/lib/supabase/browser";
import { TypeBadge } from "@/features/feed/badges";
import { DdayBadge } from "@/features/feed/DdayBadge";
import { isExpired } from "@/features/feed/dday";
import { BookmarkButton } from "@/features/bookmarks/BookmarkButton";

function todayKST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

export default function BookmarksPage() {
  const [items, setItems] = useState<Notice[] | null>(null);
  const today = todayKST();

  useEffect(() => {
    const ids = BookmarkStore.list();
    if (ids.length === 0) {
      setItems([]);
      return;
    }
    getBrowserClient()
      .from("notices")
      .select("*")
      .in("id", ids)
      .then(({ data }) => {
        const list = ((data ?? []) as Notice[]).sort((a, b) =>
          (a.apply_end ?? "9999-12-31") < (b.apply_end ?? "9999-12-31") ? -1 : 1,
        );
        setItems(list);
      });
  }, []);

  if (items === null) return <p className="text-sm text-gray-500">불러오는 중…</p>;

  return (
    <section>
      <h1 className="mb-3 text-base font-bold">관심 공고</h1>
      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500" data-testid="bookmarks-empty">
          북마크한 공고가 없어요.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((n) => (
            <article
              key={n.id}
              className={`rounded-xl border bg-white p-4 ${isExpired(n.apply_end, today) ? "opacity-50" : ""}`}
              data-testid={`bookmark-item-${n.id}`}
            >
              <div className="mb-1 flex items-center gap-1">
                <TypeBadge source={n.source} />
                <span className="ml-auto flex items-center gap-1">
                  <DdayBadge applyEnd={n.apply_end} today={today} />
                  <BookmarkButton noticeId={n.id} />
                </span>
              </div>
              <h2 className="text-sm font-semibold">
                <Link href={`/notice/${encodeURIComponent(n.id)}`} className="hover:underline">
                  {n.title}
                </Link>
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                {[n.region_sido, n.region_sigu].filter(Boolean).join(" ")}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
