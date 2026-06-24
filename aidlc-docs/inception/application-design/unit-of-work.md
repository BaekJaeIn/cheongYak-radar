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

### U6 — 프로필·자격매칭·추천 (v2 추가, Recommendation Engine)
- **책임**: 가구 프로필 저장, 공고 자격 판정, 추천 점수·정렬·사유. (FR-8~10, E6)
- **컴포넌트**: C25 ProfileRepository, C26 EligibilityMatcher, C27 RecommendationEngine, C28 CriteriaExtractor(수집 보강), C29~C32(UI)
- **서비스**: S6 RecommendationService
- **데이터**: `household_profile`(단일행), `notices.eligibility`(JSONB, U2 마이그레이션 0004), 기준표 config 파일
- **화면**: `/`(추천 피드), `/settings`(프로필), `/notice/[id]`(자격판정)
- **Epic**: E6
- **의존**: → U2(read notices/profile), ← U1(criteria 적재), → U5(신규 추천 push)

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

## 개발 순서 (v2 갱신)
**U2 ✅ → U1 ✅ → [v2] U2 마이그레이션 0004(eligibility+profile) → U1 criteria 보강 → U6(프로필·매칭·추천) → U3(추천 피드) → U4(상세·자격판정) → U5(개인화·PWA·Push)**
- U2/U1은 완료(보존). v2는 additive: 0004 마이그레이션 + U1 정규화 보강 후 U6 신설.
- U6를 U3/U4보다 먼저 만들어 추천 로직을 확정 → U3/U4 UI가 이를 표시.
- 지역 범위는 전 단위 **서울·경기** (C-6).
