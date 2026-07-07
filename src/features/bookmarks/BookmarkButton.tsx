"use client";
// 북마크 토글 버튼 (C21, US-5.1). v6: DB 기반 (C40, BR-U8-8).
import { useEffect, useState } from "react";
import { isBookmarked, toggleBookmark } from "./repository";

export function BookmarkButton({ noticeId }: { noticeId: string }) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    isBookmarked(noticeId)
      .then((v) => {
        if (alive) setOn(v);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [noticeId]);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      setOn(await toggleBookmark(noticeId));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={on}
      aria-label={on ? "북마크 해제" : "북마크"}
      className="text-lg leading-none"
      data-testid={`bookmark-btn-${noticeId}`}
    >
      <span className={on ? "text-yellow-500" : "text-gray-300"}>{on ? "★" : "☆"}</span>
    </button>
  );
}
