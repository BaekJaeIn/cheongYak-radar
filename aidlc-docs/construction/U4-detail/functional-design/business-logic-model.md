# U4 공고 상세 — Business Logic Model

## 데이터 조회 (서버)
```
getNoticeDetail(id): NoticeDetail | null
  1. notice = NoticeRepository.getById(id)        // U2, anon RLS
     if !notice → null (page → notFound)
  2. rec = recommendations where notice_id=id (단건) // anon RLS read, 없으면 null
  3. return { notice, rec }
```
> 구현: `src/features/notices/repository.ts`의 getNoticeById 재사용 + recommendations 단건 조회(`src/features/recommendations/repository.ts`에 `getRecommendationFor(id)` 추가).

## 화면 흐름
```
[/notice/[id] (RSC)]
  params.id → getNoticeDetail
    none → notFound() (404)
    ok → DetailHeader / ScheduleTimeline / EligibilityDetail / AiSummary / AreaInfo / SourceLink
```

## 타임라인 단계 산출 (순수)
```
buildTimeline(notice, today): Stage[]
  stages = [
    {key:'notice', label:'모집공고', date:notice_date},
    {key:'apply_start', label:'청약시작', date:apply_start},
    {key:'apply_end', label:'청약마감', date:apply_end},
    {key:'winner', label:'당첨발표', date:winner_date},
  ].filter(s => s.date)
  각 stage.state = date<today?'past': date==today?'current':'upcoming'
```
> `src/features/detail/timeline.ts` (순수, 테스트 대상).

## 자격조건 요약 텍스트 (순수)
```
summarizeCriteria(eligibility): string[]
  - incomePctLimit → "소득 ~한도 N% 이내"
  - assetLimit → "총자산 N억 이하"
  - residencyReq → "해당지역 거주 N개월"
  - savingsReq → "청약통장 N회/N개월"
```
> `src/features/detail/criteria-text.ts` (순수, 테스트 대상).

## 에러/경계
- 잘못된 id → 404. rec/summary/eligibility 없음 → 해당 섹션 생략(빈 화면 아님).
- 조회 실패 → 에러 경계(간단 메시지) + 피드로 돌아가기 링크.
