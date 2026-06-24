// 청약 일정 타임라인 (순수, BR-U4-2). 테스트 대상.
import type { Notice } from "@/lib/types/notice";

export type StageState = "past" | "current" | "upcoming";
export interface Stage {
  key: string;
  label: string;
  date: string; // YYYY-MM-DD
  state: StageState;
}

function stateOf(date: string, today: string): StageState {
  if (date < today) return "past";
  if (date === today) return "current";
  return "upcoming";
}

/** 값이 있는 단계만, today 기준 상태 부여. */
export function buildTimeline(notice: Notice, today: string): Stage[] {
  const defs: { key: string; label: string; date: string | null }[] = [
    { key: "notice", label: "모집공고", date: notice.notice_date },
    { key: "apply_start", label: "청약시작", date: notice.apply_start },
    { key: "apply_end", label: "청약마감", date: notice.apply_end },
    { key: "winner", label: "당첨발표", date: notice.winner_date },
  ];
  return defs
    .filter((d): d is { key: string; label: string; date: string } => !!d.date)
    .map((d) => ({ key: d.key, label: d.label, date: d.date, state: stateOf(d.date, today) }));
}
