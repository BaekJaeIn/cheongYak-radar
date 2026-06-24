# U1 수집 파이프라인 — Business Logic Model

> Edge Function `collect` 진입점. 기술 비종속 흐름(실제 Deno/Supabase 매핑은 Infrastructure Design).

## 전체 흐름 (S1 CollectionService.run)
```
1. 모드 결정: COLLECT_MODE / 키 존재 → mock | live          (BR-7)
2. Orchestrator.collectAll()
     - live: [ApplyHome, Lh, MyhomeComplex, Sh].collect() 독립 실행 (allSettled)  (BR-6)
     - mock: MockDataProvider.getMockNotices() 로 대체
     - 각 결과를 Normalizer로 NoticeInput[] 변환                                  (BR-1~5)
3. upsert: U2 upsertNotices(admin, allNotices) → { inserted, updated }           (US-2.1)
4. 요약: eligibility_summary IS NULL 대상(상한 N) → Summarizer → 재upsert         (BR-8)
5. push: inserted 있으면 U5 PushDispatcher.dispatchForNew(inserted)              (BR-9)
6. 로깅: 소스별 count/error, inserted/updated, summarized 수                      (BR-10)
return CollectionResult
```

## C1 Collector (인터페이스 + 4 구현)
```
interface Collector { source; collect(): Promise<NoticeInput[]> }
- ApplyHomeCollector: 청약홈 분양정보 API fetch → Normalizer.apt
- LhCollector:        마이홈 LH 임대 API fetch → Normalizer.lh
- MyhomeComplexCollector: 단지정보 API fetch → 보강(merge by 단지)
- ShCollector:        SH 목록 HTML fetch → cheerio 파싱 → Normalizer.sh (항목 skip-on-fail)
```

## C2 Normalizer (소스별)
```
normalize(raw) -> NoticeInput
  source_no = 원본 공고번호
  id        = makeNoticeId(source, source_no)            (U2)
  region    = parseRegion(주소/공급위치)                  (BR-2: 정규식 + 별칭표)
  area      = parseArea(면적 텍스트)                      (BR-3)
  newlywed  = inferNewlywed(supply_type/title/raw)        (BR-4)
  priority  = mapPriority(텍스트)                         (BR-5)
  dates     = parseDate(모집공고일/청약기간/발표일)
  raw       = 원본
```

## C3 CollectionOrchestrator
```
run():
  results = await Promise.allSettled(collectors.map(c => c.collect()))
  for each settled:
     fulfilled → notices 누적, perSource[source] = { count }
     rejected  → perSource[source] = { count:0, error }   (격리, BR-6)
  return { notices, perSource }
```

## C4 MockDataProvider
```
isMockMode(): COLLECT_MODE==='mock' || !DATA_GO_KR_API_KEY
getMockNotices(): NoticeInput[]   // BR-7.2 현실 세트 15~25건
```

## C6 EligibilitySummarizer (U4 소유, U1에서 실행)
```
summarizeMissing(noticeIds[] where summary is null, limit N):
  for each: text = 자격조건 원문(raw/url 기반) ; summary = claude(claude-opus-4-8)
  실패 → skip(null 유지)                                  (BR-8.2)
  성공 → upsert(eligibility_summary)                      (BR-8.1)
```

## 데이터 계약 (단위 간)
- **→ U2**: `upsertNotices(admin, NoticeInput[])` / `upsert_notices` RPC
- **→ U5**: `dispatchForNew(inserted: string[])`
- **← U4**: Summarizer 사양(모델/프롬프트)

## 처리 시나리오
- **첫 실행(mock)**: 15~25건 insert → 전부 요약 대상 → 일부 요약 생성 → push(신규).
- **재실행(갱신)**: 마감일 변동 update(요약 보존), 신규만 push.
- **소스 1개 장애(live)**: 해당 source count=0+error, 나머지 정상 적재.
