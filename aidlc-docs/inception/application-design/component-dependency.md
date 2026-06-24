# 청약레이더 — Component Dependency

## 의존 관계 다이어그램 (텍스트)
```
                 cron(07:00)
                     |
                     v
           [S1 CollectionService]
            |     |      |     |
            v     v      v     v
   C3 Orchestrator  C6 Summarizer  C5 Upserter  C7 PushDispatcher
        |                |             |              |
   C1 Collector*    (Claude API)   (DB notices)   (Web Push)
   C2 Normalizer
   C4 MockProvider (대체)

   [DB: notices] <--- RLS select-only ---+
                                          |
                          [S2 NoticeQueryService]
                                          |
                                   C8 NoticeRepository
                                          ^
                                          | searchParams
                          [S3 PersonalizationService]
                            C9 FilterStore   C10 BookmarkStore
                                          ^
                                          | (localStorage)
                          [UI C12~C24] --- 사용자

   [S4 NotificationService] C11(클라 구독) ---> DB(subscriptions)
   [S5 PwaService] 서비스워커/설치
```
\* C1 Collector = ApplyHome | Lh | MyhomeComplex | Sh

## 의존 매트릭스
| From \ To | DB notices | Claude | WebPush | localStorage | 외부 API/HTML |
|---|:---:|:---:|:---:|:---:|:---:|
| C1 Collector | – | – | – | – | ✅ |
| C5 Upserter | ✅(write) | – | – | – | – |
| C6 Summarizer | ✅(write summary) | ✅ | – | – | – |
| C7 PushDispatcher | ✅(read subs) | – | ✅ | – | – |
| C8 NoticeRepository | ✅(read) | – | – | – | – |
| C9 FilterStore | – | – | – | ✅ | – |
| C10 BookmarkStore | – | – | – | ✅ | – |
| C11 PushSubClient | ✅(write subs) | – | – | – | – |

## 통신 패턴
- **수집(서버)**: cron → S1 → 컴포넌트 직접 호출(in-process). 외부는 HTTPS fetch.
- **조회(서버)**: RSC → S2 → C8 → Supabase(anon, RLS). 필터는 URL searchParams로 전달.
- **개인화(클라)**: UI → S3 → localStorage. 변경 시 라우터 navigate로 searchParams 갱신 → 서버 재조회.
- **알림**: 구독(클라→DB), 발송(서버 S1→C7→WebPush).

## 데이터 흐름 (핵심 시나리오)
1. **자동수집**: 외부 → C1/C2 → (C6 요약) → C5 upsert → notices → (C7 push)
2. **목록 보기**: 사용자 필터(C9, searchParams) → S2 → C8 → notices → NoticeList(C16)
3. **상세+요약**: NoticeDetail → S2.getDetail → notices.eligibility_summary → EligibilitySummaryView(C19) (없으면 원문 폴백)
4. **북마크**: BookmarkButton(C21) → S3 → C10(localStorage) → BookmarkList(C22)

## 의존 방향 규칙 (결합 최소화)
- UI → Service → (Repository | Store) → (DB | localStorage). 역방향 의존 금지.
- Collector는 DB를 직접 쓰지 않음(Upserter 경유) → 수집/저장 분리(테스트 용이).
- 키 사용 컴포넌트(C6, C7, C1 실API)는 서버 경계 안에만 존재. (NFR-3)

## 단위 간 의존 (Units Generation 입력)
- **U2(데이터 플랫폼)**: 다른 단위의 기반. 먼저 스키마 확정.
- **U1(수집)** → U2(쓰기). U3/U4/U5 → U2(읽기).
- U3/U4/U5는 **목업 데이터**로 U1과 병행 가능. (US-1.7)
