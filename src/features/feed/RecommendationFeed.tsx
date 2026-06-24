// 추천 피드 (C30). 서버 컴포넌트 — items는 점수순(서버 정렬).
import type { FeedItem } from "@/features/recommendations/types";
import { RecommendationCard } from "./RecommendationCard";

export function RecommendationFeed({ items, today }: { items: FeedItem[]; today: string }) {
  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-gray-500" data-testid="feed-empty">
        현재 조건에 맞는 추천 공고가 없어요. 필터를 완화해 보세요.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3" data-testid="rec-feed">
      {items.map((item) => (
        <RecommendationCard key={item.notice.id} item={item} today={today} />
      ))}
    </div>
  );
}
