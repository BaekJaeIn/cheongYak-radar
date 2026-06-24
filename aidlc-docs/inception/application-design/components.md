# 청약레이더 — Components

> 결정: 모노 구조(Next.js + `supabase/`), 공통 Collector 인터페이스, 서버 컴포넌트 직접 쿼리, Claude 요약 수집 단계 사전 생성.
> 상세 비즈니스 로직은 Functional Design(단위별)에서 정의. 여기서는 컴포넌트·책임·인터페이스만.

## 컴포넌트 구성도 (텍스트)
```
[Supabase Edge Function: collect cron]
  CollectionOrchestrator
    -> Collector(ApplyHome | Lh | MyhomeComplex | Sh)  (공통 인터페이스)
    -> EligibilitySummarizer (Claude)
    -> NoticeUpserter -> (DB: notices)
    -> PushDispatcher -> (Web Push)
  MockDataProvider (키 미보유 시 Collector 대체)

[Next.js App Router]
  Pages: ListPage / NoticeDetailPage / BookmarksPage / SettingsPage
  Server: NoticeRepository (Supabase 직접 쿼리)
  Client: FilterStore / BookmarkStore (localStorage), PushSubscriptionClient
  UI: NoticeCard, Badges, DdayBadge, FilterPanel, ScheduleTimeline,
      UnitTable, EligibilitySummaryView, BookmarkButton, InstallPrompt, NotifyToggle
```

---

## A. 백엔드 (Supabase / 수집 — Unit U1, U2, 일부 U4/U5)

### C1. `Collector` (인터페이스) — U1
- **목적**: 외부 소스별 수집의 공통 계약. (Q-A2=A, NFR-8)
- **책임**: 외부 데이터 fetch → 정규화 → `Notice[]` 반환. 자신의 소스 식별자 제공.
- **인터페이스**: `source: SourceType`, `collect(): Promise<Notice[]>`
- **구현체**: C1a ApplyHomeCollector(`apt`), C1b LhCollector(`lh`), C1c MyhomeComplexCollector(보강), C1d ShCollector(`sh`, 크롤링).

### C2. `Normalizer` (소스별) — U1
- **목적**: 소스 원본 응답을 `Notice` 도메인 모델로 매핑.
- **책임**: 필드 매핑(공고번호→id, 지역 파싱, 면적 min/max, 날짜, newlywed/priority 추론), 원본 보존(`raw`).
- **노트**: 매핑 규칙 상세는 Functional Design.

### C3. `CollectionOrchestrator` — U1
- **목적**: cron 진입점. 모든 Collector 실행을 조율.
- **책임**: 소스별 독립 실행 + 에러 격리(NFR-4), 결과 집계, 요약·upsert·push 트리거, 실행 로깅.

### C4. `MockDataProvider` — U1
- **목적**: API 키 미보유/목업 모드 시 Collector 대체. (US-1.7, C-1)
- **책임**: 실제 스키마와 동일한 `Notice[]` 목업 제공. 환경변수로 토글.

### C5. `NoticeUpserter` — U2
- **목적**: `notices` 테이블 정합 저장.
- **책임**: 공고번호(id) 기준 upsert(ON CONFLICT DO UPDATE), `updated_at` 갱신, `raw` 보존. (US-2.1, NFR-5)

### C6. `EligibilitySummarizer` — U4
- **목적**: 자격조건 원문을 Claude API로 요약. (US-4.3, Q-A4=A)
- **책임**: claude-opus-4-8 호출, 요약 생성, 실패 시 null 폴백, 키는 서버 환경변수에서만 사용(NFR-3). 결과는 notices에 저장(캐시).

### C7. `PushDispatcher` — U5
- **목적**: 신규 공고에 대한 Web Push 발송. (US-5.4)
- **책임**: 신규 공고 판별, 구독자 조회, VAPID 서명 발송. 키는 서버 보관(NFR-3).

---

## B. 프론트엔드 데이터 접근 (Unit U2 연계)

### C8. `NoticeRepository` (서버) — U2/U3/U4
- **목적**: 서버 컴포넌트에서 Supabase를 직접 쿼리. (Q-A3=A)
- **책임**: 필터 조건(지역/면적/유형/순위/신혼/마감숨김) 적용 목록 조회, 단건 조회, 페이지네이션. 익명 키 사용(RLS 읽기전용, US-2.3).

### C9. `FilterStore` (클라이언트) — U3
- **목적**: 필터 설정의 영속화. (Q3=A localStorage)
- **책임**: 필터값 저장/복원, 기본값(안양·군포·의왕·서울) 제공, URL searchParams와 동기화(서버 쿼리용). (US-3.6)

### C10. `BookmarkStore` (클라이언트) — U5
- **목적**: 북마크 영속화(localStorage). (US-5.1)
- **책임**: 추가/제거/조회, 만료 표시 지원.

### C11. `PushSubscriptionClient` (클라이언트) — U5
- **목적**: 알림 구독 관리.
- **책임**: 권한 요청, 구독 생성, 구독 정보를 Supabase에 등록. (US-5.4)

---

## C. UI 컴포넌트 (Unit U3, U4, U5)

| ID | 컴포넌트 | 책임 | 스토리 |
|---|---|---|---|
| C12 | NoticeCard | 목록 카드(제목/지역/배지/D-day) | US-3.1~3.3 |
| C13 | TypeBadge / NewlywedTag / NewBadge | 유형·신혼·NEW 배지(텍스트 병기) | US-3.2 (NFR-7) |
| C14 | DdayBadge | 마감 D-day 계산·표시 | US-3.3 |
| C15 | FilterPanel (RegionSelect, AreaRangeSlider, TypeToggle, PriorityToggle, NewlywedToggle) | 필터 입력 | US-3.4, US-3.6 |
| C16 | NoticeList (페이지네이션/무한스크롤) | 목록 렌더·추가 로드 | US-3.5 |
| C17 | ScheduleTimeline | 청약 일정 타임라인 | US-4.2 |
| C18 | UnitTable | 면적별 세대수 테이블 | US-4.1 |
| C19 | EligibilitySummaryView | AI 자격요약 표시(+원문 폴백) | US-4.3 |
| C20 | SourceLink | 원문 링크 | US-4.4 |
| C21 | BookmarkButton | 북마크 토글 | US-5.1 |
| C22 | BookmarkList | 관심목록(마감임박 정렬·만료 흐림) | US-5.2 |
| C23 | InstallPrompt | PWA 설치 유도 | US-5.3 |
| C24 | NotifyToggle | 알림 구독 토글 | US-5.4 |

---

## 공유 도메인 모델

### `Notice` (공유 타입)
- id, source(apt|lh|sh|private), title, region_sido, region_sigu, area_min, area_max, notice_date, apply_start, apply_end, winner_date, supply_type, newlywed, pre_newlywed, priority(1순위|2순위|무순위), url, eligibility_summary?, raw, created_at, updated_at
- **노트**: SPEC §7 스키마 + `eligibility_summary`(C6 저장 컬럼) 추가.

### `NoticeFilter` (공유 타입)
- regions: string[], areaMin?, areaMax?, sources: SourceType[], priorities: string[], newlyved?: boolean, preNewlywed?: boolean, hideExpired: boolean(기본 true)
