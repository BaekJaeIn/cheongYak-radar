// C17 — 청약 일정 타임라인 (US-4.2).
import type { Notice } from "@/lib/types/notice";
import { buildTimeline } from "./timeline";

export function ScheduleTimeline({ notice, today }: { notice: Notice; today: string }) {
  const stages = buildTimeline(notice, today);
  if (stages.length === 0) return null;
  const dot: Record<string, string> = {
    past: "bg-gray-300",
    current: "bg-blue-600 ring-2 ring-blue-200",
    upcoming: "bg-gray-200",
  };
  return (
    <section className="rounded-xl border bg-white p-4" data-testid="schedule-timeline">
      <h2 className="mb-3 text-sm font-semibold">청약 일정</h2>
      <ol className="flex flex-col gap-3">
        {stages.map((s) => (
          <li key={s.key} className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${dot[s.state]}`} />
            <span className={`text-sm ${s.state === "current" ? "font-semibold text-blue-700" : "text-gray-700"}`}>
              {s.label}
            </span>
            <span className="ml-auto text-xs text-gray-500">{s.date}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
