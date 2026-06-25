// 배지 (C13, BR-U3-2). 색 + 텍스트 병기(NFR-7).
import { PROVIDER_LABEL, supplyKindLabel, type SourceType } from "@/lib/types/notice";

// 기관(어디서 모집) 배지 — 기관별 색.
const PROVIDER_STYLE: Record<SourceType, string> = {
  apt: "bg-blue-100 text-blue-800",
  lh: "bg-green-100 text-green-800",
  sh: "bg-teal-100 text-teal-800",
  gh: "bg-indigo-100 text-indigo-800",
  private: "bg-purple-100 text-purple-800",
};

// 유형(분양/임대) 배지 — 유형별 색(기관과 구분).
const KIND_STYLE: Record<string, string> = {
  분양: "bg-amber-100 text-amber-900",
  공공분양: "bg-orange-100 text-orange-900",
  임대: "bg-slate-200 text-slate-700",
  전세: "bg-cyan-100 text-cyan-800",
};

/** 기관 배지 (LH/SH/GH/청약홈/민간). */
export function ProviderBadge({ source }: { source: SourceType }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-bold ${PROVIDER_STYLE[source]}`}
      data-testid="provider-badge"
    >
      {PROVIDER_LABEL[source]}
    </span>
  );
}

/** 유형 배지 (분양/임대/전세 등). */
export function KindBadge({ supplyType, source }: { supplyType: string | null; source: SourceType }) {
  const label = supplyKindLabel(supplyType, source);
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${KIND_STYLE[label] ?? "bg-gray-100 text-gray-700"}`}
      data-testid="kind-badge"
    >
      {label}
    </span>
  );
}

/** @deprecated ProviderBadge+KindBadge로 분리. 하위호환용 유지. */
export function TypeBadge({ source }: { source: SourceType }) {
  return <ProviderBadge source={source} />;
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
