# 청약레이더 — Services (오케스트레이션)

> 서비스 = 컴포넌트들을 조율해 유스케이스를 완성하는 계층.

## S1. CollectionService (서버 / Edge Function) — U1·U2·U4·U5
- **책임**: 매일 07:00 cron으로 전체 수집 파이프라인을 오케스트레이션.
- **오케스트레이션 흐름**:
  1. `MockDataProvider.isMockMode()` 확인 → mock이면 목업, 아니면 실 Collector 사용
  2. `CollectionOrchestrator.run()` — 4개 Collector 독립 실행(에러 격리)
  3. `EligibilitySummarizer.summarizeMissing()` — 요약 없는 공고 Claude 요약 생성
  4. `NoticeUpserter.upsertMany()` — notices 정합 저장, newIds 산출
  5. `PushDispatcher.dispatchForNew(newIds)` — 신규 공고 알림
  6. 실행 로그 기록(소스별 건수·에러)
- **트랜잭션/실패 정책**: 소스 단위 실패는 격리(나머지 진행), 요약/푸시 실패는 비차단(로그).
- **연결 컴포넌트**: C3, C4, C5, C6, C7

## S2. NoticeQueryService (서버) — U3·U4
- **책임**: 화면용 공고 조회 유스케이스.
- **메서드**: `getList(filter, page)`, `getDetail(id)`
- **흐름**: 서버 컴포넌트가 `FilterStore.fromSearchParams()`로 필터 구성 → `NoticeRepository.list/getById` → 마감숨김·정렬 적용.
- **연결 컴포넌트**: C8 (+ C9 searchParams 변환)

## S3. PersonalizationService (클라이언트) — U3·U5
- **책임**: 필터 설정·북마크 등 개인화 상태 관리(localStorage).
- **메서드**: `getFilter()`, `setFilter()`, `toggleBookmark(id)`, `getBookmarks()`
- **흐름**: `/settings` 변경 → `FilterStore.save()` → 목록 URL searchParams 갱신. 북마크 → `BookmarkStore.toggle()`.
- **연결 컴포넌트**: C9, C10

## S4. NotificationService (클라이언트+서버) — U5
- **책임**: Web Push 구독(클라) + 발송(서버, CollectionService가 호출).
- **메서드**: 클라이언트 `subscribe()/unsubscribe()` (C11), 서버 발송은 S1→C7로 위임.
- **연결 컴포넌트**: C11(클라), C7(서버)

## S5. PwaService (클라이언트) — U5
- **책임**: 서비스워커 등록, 오프라인 캐시, 설치 프롬프트.
- **메서드**: `registerServiceWorker()`, `promptInstall()`
- **노트**: `next-pwa` 구성으로 대부분 처리; InstallPrompt(C23) 연동.

---

## 서비스 ↔ 단위(Unit) ↔ Epic 매핑
| Service | Unit | Epic |
|---|---|---|
| S1 CollectionService | U1, U2 | E1, E2 |
| S2 NoticeQueryService | U2, U3, U4 | E3, E4 |
| S3 PersonalizationService | U3, U5 | E3, E5 |
| S4 NotificationService | U5 | E5 |
| S5 PwaService | U5 | E5 |

## 경계 원칙
- **서버 전용**: 외부 API/크롤링, Claude, Push 발송, 키 사용 (S1, S2 read, S4 발송)
- **클라이언트 전용**: 필터/북마크 localStorage, 구독 요청, 설치 (S3, S4 구독, S5)
- **데이터 단일 출처**: `notices` (RLS 읽기전용 노출)
