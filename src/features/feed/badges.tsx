// 배지 (C13, BR-U3-2). 색 + 텍스트 병기(NFR-7).
import { SOURCE_LABEL, type SourceType } from "@/lib/types/notice";

const SOURCE_STYLE: Record<SourceType, string> = {
  apt: "bg-blue-100 text-blue-800",
  lh: "bg-green-100 text-green-800",
  sh: "bg-teal-100 text-teal-800",
  private: "bg-purple-100 text-purple-800",
};

export function TypeBadge({ source }: { source: SourceType }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${SOURCE_STYLE[source]}`}
      data-testid="type-badge"
    >
      {SOURCE_LABEL[source]}
    </span>
  );
}

export function NewBadge() {
  return (
    <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white" data-testid="new-badge">
      NEW
    </span>
  );
}

export function NewlywedTag({ newlywed, preNewlywed }: { newlywed: boolean; preNewlywed: boolean }) {
  if (!newlywed && !preNewlywed) return null;
  return (
    <span className="rounded bg-pink-100 px-1.5 py-0.5 text-xs font-medium text-pink-800" data-testid="newlywed-tag">
      {preNewlywed ? "예비신혼" : "신혼부부"}
    </span>
  );
}
