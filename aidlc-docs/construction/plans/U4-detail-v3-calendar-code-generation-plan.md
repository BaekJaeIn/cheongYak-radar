# U4 상세 — v3 캘린더 추가 Code Generation Plan

**변경요청**: v3 (청약시작일 캘린더 추가, 2026-07-07) — requirements.md §13 FR-11
**단위**: U4 상세 (기존 컴포넌트 경계 내 additive 변경, brownfield in-place)
**의존성**: 없음 (서버·DB·Edge Function 무변경). U2 도메인 타입 `Notice` 사용.
**승인 근거**: 2026-07-07 요구사항 승인("승인")이 실행 계획(즉시 Code Generation + vitest·tsc·build 검증)을 포함.

## 컨텍스트
- 방식: Google 캘린더 이벤트 템플릿 URL (`calendar.google.com/calendar/render?action=TEMPLATE`) 새 탭 열기. 계정 연동 없음 (FR-11.4).
- 일정: 청약시작일(`apply_start`) 하루 종일 일정 — `dates=YYYYMMDD/다음날YYYYMMDD` (종료 exclusive). (Q1=A)
- 노출: 상세 `/notice/[id]` '청약 일정' 타임라인의 '청약시작' 행. `apply_start` 있는 공고만. (Q2=A)
- 일정 내용: 제목 `[청약시작] {공고 제목}`, 설명 = 접수기간(마감일 있으면 병기) + 공고 원문 URL(있으면). 앱 상세 링크는 사이트 절대 URL 상수/환경변수가 코드에 없어 생략(추후 env 추가 시 확장 가능).
- 제약 고지: 템플릿 링크는 리마인더 지정 불가(C-9) — 코드 주석에 기록.

## Steps
- [x] Step 1: 순수 유틸 생성 — `src/features/detail/calendar-link.ts`: `buildGoogleCalendarUrl(notice): string | null` (apply_start 없으면 null; text/dates/details 인코딩) (FR-11.2, FR-11.3)
- [x] Step 2: 단위 테스트 — `src/features/detail/__tests__/calendar-link.test.ts`: null 케이스, dates 형식(월/연 롤오버 포함), 제목·설명 구성, URL 인코딩 (기존 timeline.test.ts 패턴)
- [x] Step 3: 버튼 노출 — `src/features/detail/ScheduleTimeline.tsx` 수정(in-place): '청약시작' 행에 `<a target="_blank" rel="noopener noreferrer" data-testid="add-to-calendar">캘린더에 추가</a>` (FR-11.1; RSC 유지, 클라이언트 JS 불요)
- [x] Step 4: 코드 요약 문서 — `aidlc-docs/construction/U4-detail/code/v3-calendar-code-summary.md`
- [x] Step 5: 검증 — vitest 전체, `tsc --noEmit`, `next build`
