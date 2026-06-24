# U4 공고 상세 — Code Summary

## 생성 파일
### 데이터
- `src/features/recommendations/repository.ts` — `getRecommendationFor(id)` 추가
- `src/features/notices/detail.ts` — `getNoticeDetail(id)`(notice+rec)

### 순수 헬퍼(테스트)
- `src/features/detail/timeline.ts` — buildTimeline
- `src/features/detail/criteria-text.ts` — summarizeCriteria, formatWon

### 컴포넌트 (`src/features/detail/`)
- DetailHeader · ScheduleTimeline · EligibilityDetail · AiSummary · AreaInfo · SourceLink

### 페이지
- `src/app/notice/[id]/page.tsx` (RSC, force-dynamic, notFound)
- `src/app/notice/[id]/not-found.tsx`

### 테스트
- `src/features/detail/__tests__/timeline.test.ts` · `criteria-text.test.ts`

## 스토리 추적
| Story | 상태 | 구현 |
|---|---|---|
| US-4.1 면적 | ✅ | AreaInfo(세대수 데이터 없으면 범위만) |
| US-4.2 일정 타임라인 | ✅ | timeline.ts + ScheduleTimeline |
| US-4.3 AI 요약 | ✅ | AiSummary(eligibility_summary, 없으면 생략) |
| US-4.4 원문 링크 | ✅ | SourceLink |
| US-6.3 자격 표시 | ✅ | EligibilityDetail + criteria-text |

## 검증
- **vitest**: 94 passed (기존 88 + U4 6: timeline 3 + criteria-text 3).
- **tsc --noEmit**: 클린.
- **next build**: 성공 — `/notice/[id]`(ƒ) 컴파일.

## 주의/후속
- 비추천 공고 직접 열람 가능(점수/자격 섹션 조건부). rec 없으면 프로필 안내.
- 세대수 등 미수집 데이터 섹션 생략(Q-FU4-3=A). 북마크 버튼·PWA·Push는 U5.
- formatWon은 억 단위 소수1자리 반올림(3.49억→3.5억) — 표시용.
