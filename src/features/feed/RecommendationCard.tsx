// 추천 카드 (C12, BR-U3-1~4). 서버 컴포넌트.
import Link from "next/link";
import type { FeedItem } from "@/features/recommendations/types";
import { ProviderBadge, KindBadge, NewlywedTag, ScoreBadge } from "./badges";
import { DdayBadge } from "./DdayBadge";
import { EligibilityBadge } from "./EligibilityBadge";
import { MatchReason } from "./MatchReason";
import { BookmarkButton } from "@/features/bookmarks/BookmarkButton";

export function RecommendationCard({ item, today }: { item: FeedItem; today: string }) {
  const { notice, rec } = item;
  return (
    <article
      className="rounded-xl border bg-white p-4 shadow-sm"
      data-testid={`rec-card-${notice.id}`}
    >
      <div className="mb-1 flex flex-wrap items-center gap-1">
        <ProviderBadge source={notice.source} />
        <KindBadge supplyType={notice.supply_type} source={notice.source} />
        <NewlywedTag newlywed={notice.newlywed} preNewlywed={notice.pre_newlywed} />
        <EligibilityBadge reasonSummary={rec.reasonSummary} />
        <span className="ml-auto flex items-center gap-1">
          <DdayBadge applyEnd={notice.apply_end} today={today} />
          <ScoreBadge score={rec.score} />
          <BookmarkButton noticeId={notice.id} />
        </span>
      </div>

      <h2 className="text-sm font-semibold leading-snug">
        <Link href={`/notice/${encodeURIComponent(notice.id)}`} className="hover:underline">
          {notice.title}
        </Link>
      </h2>
      <p className="mt-0.5 text-xs text-gray-500">
        {[notice.region_sido, notice.region_sigu].filter(Boolean).join(" ")}
        {notice.area_min != null && (
          <> · 전용 {notice.area_min}
            {notice.area_max != null && notice.area_max !== notice.area_min ? `~${notice.area_max}` : ""}㎡</>
        )}
      </p>

      <MatchReason reasonSummary={rec.reasonSummary} eligibleTypes={rec.eligibleTypes} />
    </article>
  );
}
