"use client";
// 북마크 토글 버튼 (C21, US-5.1).
import { useEffect, useState } from "react";
import { BookmarkStore } from "./store";

export function BookmarkButton({ noticeId }: { noticeId: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(BookmarkStore.has(noticeId)), [noticeId]);

  return (
    <button
      type="button"
      onClick={() => setOn(BookmarkStore.toggle(noticeId))}
      aria-pressed={on}
      aria-label={on ? "북마크 해제" : "북마크"}
      className="text-lg leading-none"
      data-testid={`bookmark-btn-${noticeId}`}
    >
      <span className={on ? "text-yellow-500" : "text-gray-300"}>{on ? "★" : "☆"}</span>
    </button>
  );
}
