"use client";
// 보조 필터 (C15 축소, BR-U3-5). URL searchParams 갱신 → 서버 재조회.
import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FeedKind } from "@/features/recommendations/types";
import { Spinner } from "@/features/ui/Spinner";

const KINDS: { key?: FeedKind; label: string }[] = [
  { key: undefined, label: "전체" },
  { key: "sale", label: "분양" },
  { key: "rent", label: "임대" },
];

export function FeedFilterBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const kind = sp.get("kind") ?? undefined;
  const expired = sp.get("expired") === "1";

  function setParam(next: { kind?: string | null; expired?: boolean }) {
    const p = new URLSearchParams(sp.toString());
    if ("kind" in next) {
      if (next.kind) p.set("kind", next.kind);
      else p.delete("kind");
    }
    if ("expired" in next) {
      if (next.expired) p.set("expired", "1");
      else p.delete("expired");
    }
    p.delete("limit"); // 필터 변경 시 페이지 초기화
    // 같은 경로라 loading.tsx 미적용 → 서버 재조회 동안 스피너 표시
    startTransition(() => router.replace(`/?${p.toString()}`));
  }

  return (
    <div className="mb-3 flex items-center gap-2" data-testid="feed-filter">
      <div className="flex rounded-lg border bg-white p-0.5">
        {KINDS.map((k) => {
          const active = (k.key ?? "") === (kind ?? "");
          return (
            <button
              key={k.label}
              onClick={() => setParam({ kind: k.key ?? null })}
              className={`rounded-md px-3 py-1 text-sm ${active ? "bg-blue-600 text-white" : "text-gray-600"}`}
              data-testid={`feed-filter-kind-${k.key ?? "all"}`}
            >
              {k.label}
            </button>
          );
        })}
      </div>
      {isPending && <Spinner size="sm" className="text-blue-600" />}
      <label className="ml-auto flex items-center gap-1 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={expired}
          onChange={(e) => setParam({ expired: e.target.checked })}
          data-testid="feed-filter-expired"
        />
        마감 포함
      </label>
    </div>
  );
}
