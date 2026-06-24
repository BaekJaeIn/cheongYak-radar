# 청약레이더 — Unit of Work

> 결정: **5단위**(Q-U1=A), **U2 먼저 → 순차**(Q-U2=A), **기능(도메인)별 폴더**(Q-U3=A).
> 배포 모델: 모노 구조(단일 Next.js 앱 + Supabase). 각 단위는 독립 배포가 아니라 **논리 모듈**.

## 단위 정의

### U1 — 수집 파이프라인 (Collection Pipeline)
- **책임**: 4개 외부 소스 수집 → 정규화 → (요약 트리거) → upsert 위임 → push 트리거. 에러 격리, 목업 모드.
- **컴포넌트**: C1 Collector(4 어댑터), C2 Normalizer, C3 CollectionOrchestrator, C4 MockDataProvider
- **서비스**: S1 CollectionService (cron 진입점)
- **배포 단위**: Supabase Edge Function `collect` + pg_cron
- **Epic**: E1

### U2 — 데이터 플랫폼 (Data Platform) — *기반, 우선 개발*
- **책임**: `notices` 스키마/인덱스/RLS, push subscriptions 테이블, upsert·조회 데이터 액세스.
- **컴포넌트**: C5 NoticeUpserter, C8 NoticeRepository, (DB 마이그레이션)
- **서비스**: S2 NoticeQueryService (조회 측)
- **Epic**: E2

### U3 — 탐색·필터 UI (Browse & Filter)
- **책임**: 목록 화면, 필터 패널, 배지/D-day, 설정 저장(localStorage↔searchParams).
- **컴포넌트**: C9 FilterStore, C12~C16(NoticeCard/Badges/DdayBadge/FilterPanel/NoticeList)
- **서비스**: S2(조회), S3 PersonalizationService(필터)
- **화면**: `/`, `/settings`
- **Epic**: E3

### U4 — 상세·AI 요약 (Detail & AI Summary)
- **책임**: 상세 화면(세대수·일정·원문), Claude 자격요약 표시(+폴백). 요약 생성기는 U1 수집에 통합되나 모델/프롬프트는 본 단위 소유.
- **컴포넌트**: C6 EligibilitySummarizer, C17~C20(ScheduleTimeline/UnitTable/EligibilitySummaryView/SourceLink)
- **서비스**: S2(상세 조회)
- **화면**: `/notice/[id]`
- **Epic**: E4

### U5 — 개인화·PWA·알림 (Personalization, PWA & Push)
- **책임**: 북마크, 관심목록, PWA 설치/오프라인, Web Push 구독·발송.
- **컴포넌트**: C10 BookmarkStore, C11 PushSubscriptionClient, C7 PushDispatcher, C21~C24
- **서비스**: S3(북마크), S4 NotificationService, S5 PwaService
- **화면**: `/bookmarks` + 전역(설치/알림)
- **Epic**: E5

---

## 코드 조직 전략 (Greenfield · 기능별 · Q-U3=A)
```
cheongYak-radar/
├── src/
│   ├── app/                       # Next.js App Router (라우트)
│   │   ├── page.tsx               # 목록 (U3)
│   │   ├── notice/[id]/page.tsx   # 상세 (U4)
│   │   ├── bookmarks/page.tsx     # 관심목록 (U5)
│   │   └── settings/page.tsx      # 설정 (U3)
│   ├── features/
│   │   ├── notices/               # U2/U3/U4 공유: 도메인 타입, NoticeRepository, NoticeCard 등
│   │   ├── filters/               # U3: FilterStore, FilterPanel, searchParams 변환
│   │   ├── detail/                # U4: ScheduleTimeline, UnitTable, EligibilitySummaryView
│   │   ├── bookmarks/             # U5: BookmarkStore, BookmarkButton/List
│   │   └── notifications/         # U5: PushSubscriptionClient, NotifyToggle
│   ├── lib/
│   │   ├── supabase/              # 서버/익명 클라이언트
│   │   └── types/                 # 공유 Notice, NoticeFilter
│   └── components/ui/             # 공용 프리미티브(배지 등)
├── supabase/
│   ├── migrations/                # U2: notices, indexes, RLS, subscriptions
│   └── functions/
│       └── collect/               # U1: collectors, normalizer, orchestrator, summarizer, mock, push
│           ├── collectors/        # apply-home, lh, myhome-complex, sh
│           └── index.ts
├── public/                        # U5: manifest.json, icons
└── next.config.js                 # U5: next-pwa
```

## 개발 순서 (Q-U2=A 순차)
**U2(데이터 스키마) → U1(수집, 목업 우선) → U3(탐색·필터) → U4(상세·AI) → U5(개인화·PWA·알림)**
- U2를 먼저 만들어 모든 단위의 데이터 계약(타입·테이블)을 고정.
- 이후 단위는 한 번에 하나씩. U3~U5는 U2의 목업/실데이터로 검증.
