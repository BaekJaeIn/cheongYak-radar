// 자격 상태 배지 (C31, BR-U3-4, Q-FU3-3=A). 3색+텍스트.
// status는 reasonSummary에 "확인 필요" 포함 여부로 파생(스키마 무변경).

export function deriveStatus(reasonSummary: string | null): "eligible" | "conditional" {
  return reasonSummary && reasonSummary.includes("확인 필요") ? "conditional" : "eligible";
}

export function EligibilityBadge({ reasonSummary }: { reasonSummary: string | null }) {
  const status = deriveStatus(reasonSummary);
  const map = {
    eligible: { label: "신청가능", cls: "bg-green-100 text-green-800" },
    conditional: { label: "확인필요", cls: "bg-amber-100 text-amber-800" },
  } as const;
  const { label, cls } = map[status];
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${cls}`} data-testid="elig-badge">
      {label}
    </span>
  );
}
