import { ddayLabel } from "./dday";

export function DdayBadge({ applyEnd, today }: { applyEnd: string | null; today: string }) {
  const label = ddayLabel(applyEnd, today);
  if (!label) return null;
  const urgent = label === "오늘마감" || /^D-[0-7]$/.test(label);
  const expired = label === "마감";
  const cls = expired
    ? "bg-gray-100 text-gray-400"
    : urgent
      ? "bg-rose-50 text-rose-600"
      : "bg-slate-100 text-slate-500";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
      data-testid="dday-badge"
    >
      {label}
    </span>
  );
}
