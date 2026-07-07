"use client";
// 관심 공고 `/bookmarks` (C22, US-5.2). v6: DB 북마크 + 레거시 로컬 1회 병합 (C40, BR-U8-8).
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Notice } from "@/lib/types/notice";
import { listBookmarkIds, mergeLocalOnce } from "@/features/bookmarks/repository";
import { getBrowserClient } from "@/lib/supabase/browser";
import { ProviderBadge, KindBadge } from "@/features/feed/badges";
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
    (async () => {
      try {
        await mergeLocalOnce(); // 레거시 localStorage → DB 1회 병합
        const ids = await listBookmarkIds();
        if (ids.length === 0) {
          setItems([]);
          return;
        }
        const { data } = await getBrowserClient().from("notices").select("*").in("id", ids);
        const list = ((data ?? []) as Notice[]).sort((a, b) =>
          (a.apply_end ?? "9999-12-31") < (b.apply_end ?? "9999-12-31") ? -1 : 1,
        );
        setItems(list);
      } catch {
        setItems([]);
      }
    })();
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
                <ProviderBadge source={n.source} />
                <KindBadge supplyType={n.supply_type} source={n.source} />
                <span className="ml-auto flex items-center gap-1">
                  <DdayBadge applyEnd={n.apply_end} today={today} />
                  <BookmarkButton noticeId={n.id} />
                </span>
              </div>
              <h2 className="text-sm font-semibold">
                <Link href={`/notice/${encodeURIComponent(n.id)}`} replace className="hover:underline">
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
