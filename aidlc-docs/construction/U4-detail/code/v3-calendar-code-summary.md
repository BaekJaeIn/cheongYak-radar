# U4 상세 — v3 캘린더 추가 코드 요약

**변경요청**: v3 (청약시작일 캘린더 추가) — requirements.md §13 FR-11 / Q1=A, Q2=A

## 생성/수정 파일
- **Created** `src/features/detail/calendar-link.ts` — `buildGoogleCalendarUrl(notice): string | null` 순수 유틸.
  - `apply_start` 없으면 null (FR-11.1 노출 조건의 근거).
  - `action=TEMPLATE`, 제목 `[청약시작] {공고 제목}`, `dates=YYYYMMDD/다음날YYYYMMDD` (종일, 종료 exclusive; UTC 산술로 월/연 롤오버 안전) (FR-11.2).
  - `details` = 접수기간(`apply_end` 있으면 `시작 ~ 마감`, 없으면 시작일만) + 공고 원문 URL(있으면) (FR-11.3).
  - 앱 상세 링크는 사이트 절대 URL env 부재로 생략 — 추후 `NEXT_PUBLIC_SITE_URL` 도입 시 확장 지점.
- **Created** `src/features/detail/__tests__/calendar-link.test.ts` — 5 tests: null 케이스, action/text/dates, 월·연 롤오버, details 구성 2종.
- **Modified** `src/features/detail/ScheduleTimeline.tsx` — '청약시작' 행에 `캘린더에 추가` 앵커 버튼(`data-testid="add-to-calendar"`, `target="_blank" rel="noopener noreferrer"`). RSC 유지 — 클라이언트 JS 추가 없음.

## 검증
- vitest **136 passed** (13 files, 신규 5 포함)
- `tsc --noEmit` clean
- `next build` OK (`/notice/[id]` dynamic 유지)

## 특이사항
- 계정 연동·서버·DB·Edge Function 변경 없음 (FR-11.4).
- C-9: 템플릿 링크는 리마인더 지정 불가 — 사용자 Google 캘린더 기본 알림 설정 적용 (유틸 주석에 명시).
