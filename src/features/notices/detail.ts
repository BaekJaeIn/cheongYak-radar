// U4 상세 데이터 결합 (BR-U4-1). notice + recommendation.
import type { Notice } from "@/lib/types/notice";
import type { FeedRec } from "@/features/recommendations/types";
import { getNoticeById } from "./repository";
import { getRecommendationFor } from "@/features/recommendations/repository";

export interface NoticeDetail {
  notice: Notice;
  rec: FeedRec | null;
}

/** 상세 조회: 공고 없으면 null(→ notFound). 추천은 없을 수 있음. */
export async function getNoticeDetail(id: string): Promise<NoticeDetail | null> {
  const notice = await getNoticeById(id);
  if (!notice) return null;
  const rec = await getRecommendationFor(id);
  return { notice, rec };
}
