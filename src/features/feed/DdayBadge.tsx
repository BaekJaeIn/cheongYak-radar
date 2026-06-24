import { ddayLabel } from "./dday";

export function DdayBadge({ applyEnd, today }: { applyEnd: string | null; today: string }) {
  const label = ddayLabel(applyEnd, today);
  if (!label) return null;
  const urgent = label === "오늘마감" || /^D-[0-7]$/.test(label);
  const expired = label === "마감";
  const cls = expired
    ? "bg-gray-200 text-gray-500"
    : urgent
      ? "bg-red-100 text-red-700"
      : "bg-gray-100 text-gray-700";
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${cls}`} data-testid="dday-badge">
      {label}
    </span>
  );
}
