# 청약레이더 — Application Design (통합)

> components.md · component-methods.md · services.md · component-dependency.md 를 통합한 상위 문서.

## 1. 설계 결정 (Application Design)
| # | 결정 | 근거 |
|---|---|---|
| Q-A1 | **모노 구조** — Next.js 앱 루트 + `supabase/`(migrations, functions) | 개인용·단일 배포, 관리 단순 |
| Q-A2 | **공통 `Collector` 인터페이스 + 소스별 어댑터** | 신규 소스 추가 용이(NFR-8), 수집/정규화 분리 |
| Q-A3 | **서버 컴포넌트 직접 Supabase 쿼리** + 필터는 URL searchParams로 동기화 | RSC 성능, 키 노출 없음, localStorage 선호값과 분리 |
| Q-A4 | **Claude 요약 수집 단계 사전 생성 → notices 저장** | 화면 응답 빠름, 공고당 1회 호출, 키 서버 보관 |

### 설계 보완 노트 (RSC ↔ localStorage 필터)
서버 컴포넌트는 localStorage를 읽을 수 없으므로, 필터는 **localStorage(영속) ↔ URL searchParams(서버 쿼리)** 로 동기화한다. 최초 진입 시 저장된 필터를 클라이언트에서 읽어 searchParams로 navigate → 서버가 해당 조건으로 조회. (FilterStore.toSearchParams/fromSearchParams)

## 2. 아키텍처 개요
- **Frontend**: Next.js 14 App Router(RSC) + Tailwind + next-pwa. 4개 라우트(`/`, `/notice/[id]`, `/bookmarks`, `/settings`).
- **Backend(BaaS)**: Supabase — PostgreSQL(`notices`, push subscriptions), RLS(익명 읽기전용), Edge Function(cron 수집), pg_cron.
- **외부**: 청약홈/LH/마이홈 단지 API, SH 크롤링, Claude API, Web Push.

## 3. 컴포넌트 요약
- **수집(U1)**: Collector(4) · Normalizer · CollectionOrchestrator · MockDataProvider
- **데이터(U2)**: NoticeUpserter · NoticeRepository · (notices 스키마/인덱스/RLS)
- **탐색·필터(U3)**: FilterStore · NoticeCard/Badges/DdayBadge/FilterPanel/NoticeList
- **상세·AI(U4)**: EligibilitySummarizer · ScheduleTimeline/UnitTable/EligibilitySummaryView/SourceLink
- **개인화·PWA·알림(U5)**: BookmarkStore · PushSubscriptionClient · PushDispatcher · BookmarkButton/List/InstallPrompt/NotifyToggle
> 상세: [components.md](components.md), [component-methods.md](component-methods.md)

## 4. 서비스 계층
- **S1 CollectionService**(서버 cron 오케스트레이션) · **S2 NoticeQueryService**(조회) · **S3 PersonalizationService**(필터/북마크) · **S4 NotificationService**(구독/발송) · **S5 PwaService**(SW/설치)
> 상세: [services.md](services.md)

## 5. 의존·데이터 흐름
- UI → Service → (Repository|Store) → (DB|localStorage). 키 사용은 서버 경계 내부로 한정(NFR-3).
- 수집/저장 분리(Collector는 Upserter 경유). U3~U5는 목업으로 U1과 병행 가능.
> 상세: [component-dependency.md](component-dependency.md)

## 6. 단위(Unit) 경계 (Units Generation 입력)
| Unit | 범위 | Epic | 의존 |
|---|---|---|---|
| U1 수집 파이프라인 | Collector·Normalizer·Orchestrator·Mock | E1 | → U2(write) |
| U2 데이터 플랫폼 | 스키마·인덱스·RLS·Upserter·Repository | E2 | 기반(우선) |
| U3 탐색·필터 UI | 목록·필터·배지·설정 | E3 | → U2(read) |
| U4 상세·AI 요약 | 상세·타임라인·세대수·Claude 요약 | E4 | → U2(read), Summarizer는 U1 수집에 통합 |
| U5 개인화·PWA·알림 | 북마크·관심목록·PWA·Push | E5 | → U2, U1(push 트리거) |

## 7. 설계 검증 (완전성·일관성)
- [x] 모든 Epic/스토리가 컴포넌트·서비스로 커버됨 (E1→C1~C4/S1, E2→C5/C8/S1·S2, E3→C9/C12~C16/S2·S3, E4→C6/C17~C20/S2, E5→C7/C10/C11/C21~C24/S3·S4·S5)
- [x] NFR 반영: 인덱스(C8), RLS(U2), 키 서버보관(C6/C7/C1), 에러격리(C3), upsert 정합(C5), 접근성 텍스트 배지(C13)
- [x] 의존 방향 단방향, 키 경계 명확
- [x] 단위 분해와 의존 순서 정의(U2 우선, 나머지 목업 병행)
