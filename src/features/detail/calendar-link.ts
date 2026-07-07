// FR-11 캘린더 추가 — Google 캘린더 이벤트 템플릿 URL 생성 (순수, 테스트 대상).
// 계정 연동 없음: 링크는 기기에 로그인된 사용자 본인 Google 계정으로 열린다 (FR-11.4).
// 제약 C-9: 템플릿 링크로는 리마인더 시각을 지정할 수 없다 (사용자 기본 알림 설정 적용).
import type { Notice } from "@/lib/types/notice";

const GOOGLE_CALENDAR_BASE = "https://calendar.google.com/calendar/render";

/** YYYY-MM-DD → YYYYMMDD */
function compact(date: string): string {
  return date.replaceAll("-", "");
}

/** 종일 일정의 종료일은 exclusive — 시작일 다음날을 YYYYMMDD로. */
function nextDayCompact(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return compact(d.toISOString().slice(0, 10));
}

/**
 * 청약시작일 하루 종일(All-day) 일정의 Google 캘린더 템플릿 URL (FR-11.2~11.3).
 * apply_start 없으면 null.
 */
export function buildGoogleCalendarUrl(notice: Notice): string | null {
  if (!notice.apply_start) return null;
  const lines = [
    notice.apply_end
      ? `청약 접수: ${notice.apply_start} ~ ${notice.apply_end}`
      : `청약 접수 시작: ${notice.apply_start}`,
  ];
  if (notice.url) lines.push(`공고 원문: ${notice.url}`);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `[청약시작] ${notice.title}`,
    dates: `${compact(notice.apply_start)}/${nextDayCompact(notice.apply_start)}`,
    details: lines.join("\n"),
  });
  return `${GOOGLE_CALENDAR_BASE}?${params.toString()}`;
}
