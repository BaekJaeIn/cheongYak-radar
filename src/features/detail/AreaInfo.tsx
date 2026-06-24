// 면적 정보 (US-4.1 적응). 세대수 데이터 없으면 범위만.
import type { Notice } from "@/lib/types/notice";

export function AreaInfo({ notice }: { notice: Notice }) {
  if (notice.area_min == null && notice.area_max == null) return null;
  const range =
    notice.area_min != null && notice.area_max != null && notice.area_min !== notice.area_max
      ? `${notice.area_min}~${notice.area_max}㎡`
      : `${notice.area_min ?? notice.area_max}㎡`;
  return (
    <section className="rounded-xl border bg-white p-4" data-testid="area-info">
      <h2 className="mb-1 text-sm font-semibold">전용면적</h2>
      <p className="text-sm text-gray-700">{range}</p>
    </section>
  );
}
