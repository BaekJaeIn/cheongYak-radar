# U2 데이터 플랫폼 — Code Generation 계획 (PART 1)

**워크스페이스 루트**: `/Users/baekjaein/git-repo/cheongYak-radar` (greenfield, 모노 구조)
**단위**: U2 데이터 플랫폼 (첫 단위 — 기반)
**구현 스토리**: US-2.1(upsert 스키마), US-2.2(인덱스), US-2.3(RLS)
**의존**: 없음(기반). 산출물은 U1(쓰기)·U3/U4(읽기)·U5(구독)의 계약이 됨.
**도구**: Node v23, npm 10. Next.js 14 + TypeScript + Supabase.

> **단일 진실원천**: 이 계획이 U2 코드 생성의 기준. 단계별 [x] 갱신.
> 코드는 워크스페이스 루트(앱 코드)에, 문서 요약만 `aidlc-docs/construction/U2-data-platform/code/`에.

---

## 생성 단계 (PART 2에서 순차 실행)

### Step 1: 프로젝트 기반 스캐폴딩 (greenfield, U2 빌드/테스트 최소셋) ✅ 완료
- [x] `package.json` — next 14, react, typescript, @supabase/supabase-js, vitest(테스트), tsx 등
- [x] `tsconfig.json` — paths(`@/*` → src), strict
- [x] `next.config.js` — 기본(추후 U5에서 next-pwa 추가)
- [x] `.env.example` — Supabase/Anthropic/VAPID 키 placeholder (NFR-3 경계 주석)
- [x] `.gitignore`
- [x] `vitest.config.ts`
> 비고: 전체 앱 셋업(볼트1)은 U1/U5에서 보강. 여기선 U2 컴파일·테스트에 필요한 최소만.

### Step 2: 공유 도메인 타입 (Business Logic) ✅ 완료
- [x] `src/lib/types/notice.ts` — `SourceType`, `Priority`, `Notice`, `NoticeFilter`, `Cursor` (domain-entities.md 반영)

### Step 3: DB 마이그레이션 (Database Migration Scripts) — US-2.1, US-2.2, US-2.3 ✅ 완료
- [x] `supabase/migrations/0001_init_notices.sql` — notices 테이블 + 인덱스 7종 + RLS + upsert_notices RPC
- [x] `supabase/migrations/0002_push_subscriptions.sql` — push_subscriptions + RLS(익명 INSERT)
- [x] `supabase/seed.sql` — 스키마 검증용 목업 notices 3건

### Step 4: Supabase 클라이언트 (Repository Layer 기반) ✅ 완료
- [x] `src/lib/supabase/server.ts` — anon 서버 클라이언트(RSC 조회용)
- [x] `src/lib/supabase/admin.ts` — service_role 클라이언트(쓰기용, 서버 전용 가드)

### Step 5: Repository — 조회 (C8) — US-2.2 연계  ✅ 완료
- [x] `src/features/notices/repository.ts` — `listNotices(filter, page)`, `getNoticeById(id)`
- [x] `src/features/notices/query-builder.ts` — `NoticeFilter` → Supabase 쿼리 절(필터/정렬/커서) 순수 변환

### Step 6: Upserter — 쓰기 helper (C5) — US-2.1  ✅ 완료
- [x] `src/features/notices/upserter.ts` — `upsertNotices(client, notices)` (BR-2: 요약/created_at 보존, newIds 반환)

### Step 7: 단위 테스트 (Unit Testing)  ✅ 완료 (21 passed)
- [x] `src/features/notices/__tests__/query-builder.test.ts` — 필터 매핑/정렬/커서/마감숨김 규칙 검증(BR-3~5)
- [x] `src/features/notices/__tests__/upserter.test.ts` — 합성키 생성·요약 보존 병합 로직 검증(BR-1, BR-2)
> 실행은 Build & Test 단계 재확인. 본 단계에서 vitest 21 passed 확인.

### Step 8: 문서/요약 (Documentation)  ✅ 완료
- [x] `aidlc-docs/construction/U2-data-platform/code/U2-code-summary.md` — 생성 파일 목록·스토리 추적·실행법

---

## 스토리 추적
| Story | 구현 위치 |
|---|---|
| US-2.1 upsert 스키마 | Step 3(0001), Step 6 upserter |
| US-2.2 인덱스 | Step 3(0001 인덱스), Step 5 repository |
| US-2.3 RLS | Step 3(0001/0002 RLS 정책) |

## 총 8단계 · 예상 산출: 앱 코드 ~13파일 + 마이그레이션 3 + 테스트 2 + 문서 1
