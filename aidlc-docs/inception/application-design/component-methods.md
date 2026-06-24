# 청약레이더 — Component Methods

> 메서드 시그니처와 입출력만 정의. **상세 비즈니스 규칙은 Functional Design(단위별)에서.**
> 표기는 TypeScript 스타일(실 구현 언어와 동일).

## C1. Collector (인터페이스)
```ts
interface Collector {
  readonly source: SourceType;           // 'apt' | 'lh' | 'sh' | 'private'
  collect(): Promise<Notice[]>;          // fetch + normalize. 실패 시 throw (격리는 Orchestrator)
}
```
- 구현: ApplyHomeCollector / LhCollector / MyhomeComplexCollector / ShCollector

## C2. Normalizer (소스별)
```ts
normalize(raw: unknown): Notice          // 원본 1건 → 도메인 모델
parseRegion(addr: string): { sido: string; sigu: string }
parseArea(text: string): { min?: number; max?: number }
inferNewlywed(raw): { newlywed: boolean; preNewlywed: boolean }
```

## C3. CollectionOrchestrator
```ts
run(): Promise<CollectionResult>         // cron 진입점
// CollectionResult = { perSource: { source, count, error? }[], total, newIds: string[] }
private collectAll(): Promise<SettledResult[]>   // 소스별 독립 실행(에러 격리)
```

## C4. MockDataProvider
```ts
isMockMode(): boolean                    // env: COLLECT_MODE === 'mock' or no keys
getMockNotices(source: SourceType): Notice[]
```

## C5. NoticeUpserter
```ts
upsertMany(notices: Notice[]): Promise<{ inserted: string[]; updated: string[] }>
// ON CONFLICT (id) DO UPDATE; created_at 보존, updated_at 갱신, raw 저장
```

## C6. EligibilitySummarizer
```ts
summarize(notice: Notice): Promise<string | null>  // Claude 호출, 실패 시 null
summarizeMissing(notices: Notice[]): Promise<void>  // eligibility_summary 없는 건만 생성·저장
// 모델: claude-opus-4-8. 키: process.env.ANTHROPIC_API_KEY (서버 전용)
```

## C7. PushDispatcher
```ts
dispatchForNew(newIds: string[]): Promise<{ sent: number; failed: number }>
private getSubscriptions(): Promise<PushSubscription[]>
// VAPID 키 서버 보관(NFR-3)
```

## C8. NoticeRepository (서버)
```ts
list(filter: NoticeFilter, page: { cursor?: string; limit: number }): Promise<{ items: Notice[]; nextCursor?: string }>
getById(id: string): Promise<Notice | null>
// 익명(anon) 키, RLS select-only. 필터/마감숨김/정렬은 쿼리에서 적용. 인덱스 사용(US-2.2)
```

## C9. FilterStore (클라이언트)
```ts
load(): NoticeFilter                     // 없으면 기본값(안양·군포·의왕·서울, hideExpired=true)
save(filter: NoticeFilter): void         // localStorage 저장
toSearchParams(filter: NoticeFilter): URLSearchParams   // 서버 쿼리 동기화(Q-A3 보완)
fromSearchParams(sp: URLSearchParams): NoticeFilter
```

## C10. BookmarkStore (클라이언트)
```ts
list(): string[]                         // notice id 목록
toggle(id: string): boolean              // 반환: 토글 후 북마크 여부
has(id: string): boolean
```

## C11. PushSubscriptionClient (클라이언트)
```ts
requestPermissionAndSubscribe(): Promise<PushSubscription | null>
register(sub: PushSubscription): Promise<void>     // Supabase에 저장
unsubscribe(): Promise<void>
```

## C12~C24 UI 컴포넌트 (props 시그니처 요약)
```ts
NoticeCard(props: { notice: Notice; bookmarked: boolean })
TypeBadge(props: { source: SourceType })            // 텍스트 라벨 병기(NFR-7)
DdayBadge(props: { applyEnd?: string })             // D-n / 마감 계산
FilterPanel(props: { value: NoticeFilter; onChange(f: NoticeFilter): void })
NoticeList(props: { initialItems: Notice[]; filter: NoticeFilter })
ScheduleTimeline(props: { notice: Notice })
UnitTable(props: { units: { area: number; count: number }[] })
EligibilitySummaryView(props: { summary?: string | null; rawUrl?: string })  // 폴백: 원문 링크
BookmarkButton(props: { id: string })
BookmarkList(props: { ids: string[] })
InstallPrompt()                                     // beforeinstallprompt 처리
NotifyToggle()                                      // 구독 on/off
```

> **노트**: 모든 외부/AI 키 사용 메서드(C6, C7)는 서버(Edge Function/Route Handler)에서만 호출. 클라이언트 번들 미포함. (NFR-3)
