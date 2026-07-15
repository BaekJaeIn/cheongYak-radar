"use client";
// '더 보기' — 같은 경로 쿼리(limit) 변경이라 loading.tsx가 안 뜸 → useTransition으로
// 서버 재요청 동안 스피너 표시(BR-U3-5 피드 페이지네이션).
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/features/ui/Spinner";

export function LoadMoreButton({ href }: { href: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.replace(href))}
      disabled={isPending}
      data-testid="feed-load-more"
      className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-blue-700 disabled:opacity-60"
    >
      {isPending && <Spinner size="sm" />}
      {isPending ? "불러오는 중…" : "더 보기"}
    </button>
  );
}
