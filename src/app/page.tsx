// 추천 피드 `/` (FeedPage, RSC, 동적 no-store). US-6.5, US-3.1~3.5.
import Link from "next/link";
import { getRecommendationFeed } from "@/features/recommendations/repository";
import { fromSearchParams } from "@/features/recommendations/feed-filter";
import { RecommendationFeed } from "@/features/feed/RecommendationFeed";
import { FeedFilterBar } from "@/features/feed/FeedFilterBar";
import { todayKST } from "@/features/notices/query-builder";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default async function FeedPage({ searchParams }: { searchParams: SP }) {
  const filter = fromSearchParams(searchParams);
  const limit = Math.max(20, Number(searchParams.limit) || 20);
  const today = todayKST();

  let feed;
  try {
    feed = await getRecommendationFeed(filter, limit, today);
  } catch {
    feed = { items: [], hasMore: false, total: 0 };
  }

  const nextParams = new URLSearchParams();
  if (filter.kind) nextParams.set("kind", filter.kind);
  if (!filter.hideExpired) nextParams.set("expired", "1");
  nextParams.set("limit", String(limit + 20));

  return (
    <section>
      <h1 className="mb-1 text-base font-bold">우리 커플 맞춤 추천</h1>
      <p className="mb-3 text-xs text-gray-500">
        서울·경기 공고를 자격·순위로 추천해요. 결과가 비어 있으면{" "}
        <Link href="/settings" className="text-blue-700 underline">
          내 프로필
        </Link>
        을 입력해 보세요.
      </p>

      <FeedFilterBar />
      <RecommendationFeed items={feed.items} today={today} />

      {feed.hasMore && (
        <div className="mt-4 text-center">
          <Link
            href={`/?${nextParams.toString()}`}
            className="inline-block rounded-lg border bg-white px-4 py-2 text-sm font-medium text-blue-700"
            data-testid="feed-load-more"
          >
            더 보기
          </Link>
        </div>
      )}
    </section>
  );
}
