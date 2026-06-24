// 공고 상세 `/notice/[id]` (RSC, 동적). US-4.1~4.4, US-6.3.
import Link from "next/link";
import { notFound } from "next/navigation";
import { getNoticeDetail } from "@/features/notices/detail";
import { todayKST } from "@/features/notices/query-builder";
import { DetailHeader } from "@/features/detail/DetailHeader";
import { ScheduleTimeline } from "@/features/detail/ScheduleTimeline";
import { EligibilityDetail } from "@/features/detail/EligibilityDetail";
import { AiSummary } from "@/features/detail/AiSummary";
import { AreaInfo } from "@/features/detail/AreaInfo";
import { SourceLink } from "@/features/detail/SourceLink";

export const dynamic = "force-dynamic";

export default async function NoticeDetailPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);
  let detail;
  try {
    detail = await getNoticeDetail(id);
  } catch {
    detail = null;
  }
  if (!detail) notFound();

  const { notice, rec } = detail;
  const today = todayKST();

  return (
    <div className="flex flex-col gap-3">
      <Link href="/" className="text-xs text-blue-700" data-testid="back-to-feed">
        ← 추천으로
      </Link>
      <DetailHeader notice={notice} rec={rec} today={today} />
      <ScheduleTimeline notice={notice} today={today} />
      <EligibilityDetail rec={rec} eligibility={notice.eligibility} />
      <AiSummary summary={notice.eligibility_summary} />
      <AreaInfo notice={notice} />
      <SourceLink url={notice.url} />
    </div>
  );
}
