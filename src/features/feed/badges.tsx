// 배지 (C13, BR-U3-2). 파스텔톤 + 텍스트 병기(NFR-7).
import { PROVIDER_LABEL, supplyKindLabel, type SourceType } from "@/lib/types/notice";

// 파스텔 공통 모양 — 둥근 알약, 낮은 채도 배경 + 진한 글자.
const PILL = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";

// 기관(어디서 모집) 배지 — 기관별 파스텔색.
const PROVIDER_STYLE: Record<SourceType, string> = {
  apt: "bg-sky-50 text-sky-700",
  lh: "bg-emerald-50 text-emerald-700",
  sh: "bg-teal-50 text-teal-700",
  gh: "bg-indigo-50 text-indigo-700",
  private: "bg-violet-50 text-violet-700",
};

// 유형(분양/임대) 배지 — 유형별 파스텔색(기관과 구분).
const KIND_STYLE: Record<string, string> = {
  분양: "bg-amber-50 text-amber-700",
  공공분양: "bg-orange-50 text-orange-700",
  임대: "bg-slate-100 text-slate-600",
  전세: "bg-cyan-50 text-cyan-700",
};

/** 기관 배지 (LH/SH/GH/청약홈/민간). */
export function ProviderBadge({ source }: { source: SourceType }) {
  return (
    <span className={`${PILL} ${PROVIDER_STYLE[source]}`} data-testid="provider-badge">
      {PROVIDER_LABEL[source]}
    </span>
  );
}

/** 유형 배지 (분양/임대/전세 등). */
export function KindBadge({ supplyType, source }: { supplyType: string | null; source: SourceType }) {
  const label = supplyKindLabel(supplyType, source);
  return (
    <span className={`${PILL} ${KIND_STYLE[label] ?? "bg-gray-50 text-gray-600"}`} data-testid="kind-badge">
      {label}
    </span>
  );
}

/** @deprecated ProviderBadge+KindBadge로 분리. 하위호환용 유지. */
export function TypeBadge({ source }: { source: SourceType }) {
  return <ProviderBadge source={source} />;
}

export function NewlywedTag({ newlywed, preNewlywed }: { newlywed: boolean; preNewlywed: boolean }) {
  if (!newlywed && !preNewlywed) return null;
  return (
    <span className={`${PILL} bg-rose-50 text-rose-600`} data-testid="newlywed-tag">
      {preNewlywed ? "예비신혼" : "신혼부부"}
    </span>
  );
}

/** 추천 점수 배지 — 파스텔 블루. */
export function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className={`${PILL} bg-blue-50 font-semibold text-blue-700`}
      title="추천 점수"
      data-testid="rec-score"
    >
      {Math.round(score)}점
    </span>
  );
}
