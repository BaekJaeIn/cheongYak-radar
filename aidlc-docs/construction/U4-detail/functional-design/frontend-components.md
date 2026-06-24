# U4 공고 상세 — Frontend Components

> `/notice/[id]` (RSC). 결정: 저장된 recommendation+eligibility 기반(A), 저장 eligibility_summary 표시(A), 있는 정보만(A).

## 화면 구성 (위→아래)
```
app/notice/[id]/page.tsx (RSC: NoticeDetailPage)
  └ DetailHeader (제목·지역·TypeBadge·NewlywedTag·DdayBadge·점수·EligibilityBadge)
  └ ScheduleTimeline (C17) — 모집공고→청약→발표→계약
  └ EligibilityDetail (C31 확장) — 신청가능 유형 chips + reasonSummary + 공고 자격조건 요약
  └ AiSummary (C19) — eligibility_summary (있을 때만)
  └ AreaInfo (C18 축소) — 전용면적 범위 (세대수 데이터 있으면 표, 없으면 범위만)
  └ SourceLink (C20) — 원문 보기(url, 새 탭)
  └ (BookmarkButton C21 자리 — U5)
```

## 컴포넌트
### NoticeDetailPage (app/notice/[id]/page.tsx) — RSC
- params.id → `getNoticeDetail(id)` → { notice, rec? }. 없으면 `notFound()`(404).
- 동적(force-dynamic), anon RLS read.

### DetailHeader
- props: `{ notice, rec? }`. 배지/점수/D-day. rec 없으면 점수·자격 배지 생략(비추천 공고도 직접 열람 가능).

### ScheduleTimeline (C17) — US-4.2
- props: `{ notice }`. 단계 배열 [모집공고일, 청약시작, 청약마감, 당첨발표]. 값 있는 단계만, 현재 단계 강조(today 기준).
- `data-testid="schedule-timeline"`.

### EligibilityDetail (C31) — US-6.3
- props: `{ rec?, eligibility? }`. rec.eligibleTypes chips + reasonSummary. notice.eligibility(소득%·자산·거주·통장) 요약 라인. rec 없으면 "추천 대상 아님/프로필 확인" 안내.

### AiSummary (C19) — US-4.3
- props: `{ summary?: string|null }`. 있으면 카드, 없으면 렌더 안 함(Q-FU4-2=A). 출처 주석("AI 요약, 원문 확인 권장").

### AreaInfo — US-4.1(적응)
- props: `{ notice }`. area_min~max. (raw에 세대수 있으면 표, 기본은 범위만, Q-FU4-3=A)

### SourceLink (C20) — US-4.4
- props: `{ url }`. 새 탭 원문. `data-testid="source-link"`.

## 공유 타입
- `NoticeDetail = { notice: Notice; rec: FeedRec | null }`
