// 공고 상세 정보 (US-4.1 보강). 핵심 필드를 정의형 목록으로 표출.
import type { Notice } from "@/lib/types/notice";
import { PROVIDER_LABEL } from "@/lib/types/notice";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between gap-3 py-1.5">
      <dt className="shrink-0 text-xs text-gray-500">{label}</dt>
      <dd className="text-right text-sm text-gray-800">{value}</dd>
    </div>
  );
}

export function DetailFacts({ notice }: { notice: Notice }) {
  const region = [notice.region_sido, notice.region_sigu].filter(Boolean).join(" ");
  const area =
    notice.area_min != null || notice.area_max != null
      ? notice.area_min != null && notice.area_max != null && notice.area_min !== notice.area_max
        ? `전용 ${notice.area_min}~${notice.area_max}㎡`
        : `전용 ${notice.area_min ?? notice.area_max}㎡`
      : null;
  const newlywedText = notice.pre_newlywed ? "예비신혼 가능" : notice.newlywed ? "신혼부부" : null;

  return (
    <section className="rounded-xl border bg-white p-4" data-testid="detail-facts">
      <h2 className="mb-1 text-sm font-semibold">공고 정보</h2>
      <dl className="divide-y divide-gray-100">
        <Row label="모집 기관" value={PROVIDER_LABEL[notice.source]} />
        <Row label="공급 유형" value={notice.supply_type} />
        <Row label="지역" value={region} />
        <Row label="전용면적" value={area} />
        <Row label="청약 순위" value={notice.priority} />
        <Row label="신혼 대상" value={newlywedText} />
        <Row label="공고번호" value={notice.source_no} />
      </dl>
    </section>
  );
}
