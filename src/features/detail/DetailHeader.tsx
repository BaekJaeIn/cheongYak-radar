import type { Notice } from "@/lib/types/notice";
import type { FeedRec } from "@/features/recommendations/types";
import { TypeBadge, NewlywedTag } from "@/features/feed/badges";
import { DdayBadge } from "@/features/feed/DdayBadge";
import { EligibilityBadge } from "@/features/feed/EligibilityBadge";

export function DetailHeader({
  notice,
  rec,
  today,
}: {
  notice: Notice;
  rec: FeedRec | null;
  today: string;
}) {
  return (
    <header className="rounded-xl border bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center gap-1">
        <TypeBadge source={notice.source} />
        <NewlywedTag newlywed={notice.newlywed} preNewlywed={notice.pre_newlywed} />
        {rec && <EligibilityBadge reasonSummary={rec.reasonSummary} />}
        <span className="ml-auto flex items-center gap-1">
          <DdayBadge applyEnd={notice.apply_end} today={today} />
          {rec && (
            <span className="rounded bg-blue-600 px-1.5 py-0.5 text-xs font-bold text-white">
              {Math.round(rec.score)}점
            </span>
          )}
        </span>
      </div>
      <h1 className="text-lg font-bold leading-snug">{notice.title}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {[notice.region_sido, notice.region_sigu].filter(Boolean).join(" ")}
        {notice.priority ? ` · ${notice.priority}` : ""}
      </p>
    </header>
  );
}
