// D-day 계산 (순수, BR-U3-3). 테스트 대상.

export function daysUntil(applyEnd: string | null, today: string): number | null {
  if (!applyEnd) return null;
  const a = new Date(applyEnd + "T00:00:00Z").getTime();
  const b = new Date(today + "T00:00:00Z").getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((a - b) / 86400000);
}

/** "D-3" / "오늘마감" / "마감" / null(날짜 없음). */
export function ddayLabel(applyEnd: string | null, today: string): string | null {
  const d = daysUntil(applyEnd, today);
  if (d == null) return null;
  if (d < 0) return "마감";
  if (d === 0) return "오늘마감";
  return `D-${d}`;
}

export function isExpired(applyEnd: string | null, today: string): boolean {
  const d = daysUntil(applyEnd, today);
  return d != null && d < 0;
}

/** created_at(타임스탬프)이 오늘(KST)인지 → NEW 배지. */
export function isNew(createdAt: string, today: string): boolean {
  return (createdAt ?? "").slice(0, 10) === today;
}
