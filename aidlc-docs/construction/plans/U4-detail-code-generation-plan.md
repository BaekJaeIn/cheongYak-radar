# U4 공고 상세 — Code Generation 계획 (PART 1)

**단위**: U4 (`/notice/[id]`). **스토리**: US-4.1~4.4 + US-6.3 표시.
**재사용**: notices.getNoticeById(U2), recommendations(U6), feed 배지(U3 badges/DdayBadge/EligibilityBadge).

## 생성 단계 (PART 2)
### Step 1: 데이터 결합
- [x] `src/features/recommendations/repository.ts` — `getRecommendationFor(id)` 추가(단건)
- [x] `src/features/notices/detail.ts` — `getNoticeDetail(id): {notice, rec} | null`

### Step 2: 순수 헬퍼(테스트 대상)
- [x] `src/features/detail/timeline.ts` — `buildTimeline(notice, today): Stage[]`
- [x] `src/features/detail/criteria-text.ts` — `summarizeCriteria(eligibility): string[]`

### Step 3: 상세 컴포넌트 (`src/features/detail/`)
- [x] `DetailHeader.tsx` · `ScheduleTimeline.tsx` · `EligibilityDetail.tsx` · `AiSummary.tsx` · `AreaInfo.tsx` · `SourceLink.tsx`

### Step 4: 페이지
- [x] `src/app/notice/[id]/page.tsx` (RSC, force-dynamic, notFound)
- [x] `src/app/notice/[id]/not-found.tsx`

### Step 5: 테스트 + 검증 + 문서
- [x] `src/features/detail/__tests__/timeline.test.ts` · `criteria-text.test.ts`
- [x] vitest + tsc + next build 확인
- [x] `aidlc-docs/construction/U4-detail/code/U4-code-summary.md`

## 스토리 추적
| Story | 구현 |
|---|---|
| US-4.1 면적/세대수 | AreaInfo |
| US-4.2 일정 타임라인 | timeline.ts + ScheduleTimeline |
| US-4.3 AI 요약 | AiSummary(eligibility_summary) |
| US-4.4 원문 링크 | SourceLink |
| US-6.3 자격 표시 | criteria-text + EligibilityDetail |

## 총 5단계 · 앱 ~11파일 + 테스트 2 + 문서 1.
