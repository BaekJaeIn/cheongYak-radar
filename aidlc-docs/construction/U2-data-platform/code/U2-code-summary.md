# U2 데이터 플랫폼 — Code Summary

> 생성된 코드의 요약·추적·실행법. (앱 코드는 워크스페이스 루트, 본 문서는 docs)

## 생성 파일 (Created — greenfield)

### 프로젝트 기반 (Step 1)
- `package.json`, `tsconfig.json`, `next.config.js`, `vitest.config.ts`, `.env.example`, `.gitignore`

### 도메인 타입 (Step 2)
- `src/lib/types/notice.ts` — `Notice`, `NoticeInput`, `NoticeFilter`, `Cursor`, `SourceType`, `Priority`, `defaultFilter()`, `DEFAULT_REGIONS`, `SOURCE_LABEL`

### DB 마이그레이션 (Step 3) — US-2.1/2.2/2.3
- `supabase/migrations/0001_init_notices.sql` — notices 테이블, 생성컬럼 `sort_apply_end`, 인덱스 7종, RLS(익명 읽기전용), `upsert_notices(jsonb)` RPC(요약·created_at 보존, was_inserted 반환)
- `supabase/migrations/0002_push_subscriptions.sql` — push_subscriptions, RLS(익명 INSERT)
- `supabase/seed.sql` — 검증용 목업 3건

### Supabase 클라이언트 (Step 4)
- `src/lib/supabase/server.ts` — anon(RSC 조회)
- `src/lib/supabase/admin.ts` — service_role(쓰기, 브라우저 호출 가드)

### Repository / 쿼리 (Step 5)
- `src/features/notices/query-builder.ts` — `buildQuery`, `todayKST`, 커서 인코딩 (순수 함수)
- `src/features/notices/repository.ts` — `listNotices(filter, page)`, `getNoticeById(id)`

### Upserter (Step 6)
- `src/features/notices/upserter.ts` — `upsertNotices`, `makeNoticeId`, `toRpcRow`

### 테스트 (Step 7)
- `src/features/notices/__tests__/query-builder.test.ts` (13)
- `src/features/notices/__tests__/upserter.test.ts` (8)

## 스토리 추적
| Story | 상태 | 구현 |
|---|---|---|
| US-2.1 upsert 스키마 | ✅ | 0001 테이블/RPC, upserter.ts |
| US-2.2 인덱스 | ✅ | 0001 인덱스 7종, repository 정렬/커서 |
| US-2.3 RLS | ✅ | 0001/0002 RLS 정책 |

## 검증 결과
- **단위 테스트**: `npx vitest run` → **21 passed** (2026-06-24 확인). 필터 매핑(BR-3), 정렬/커서(BR-4/5), KST(BR-8), 합성키(BR-1), 요약 보존 분기(BR-2) 커버.
- 마이그레이션/RLS 실DB 검증은 Build & Test 단계에서 `supabase db reset`으로 수행 예정.

## 실행법
```bash
npm install
# 로컬 DB (Supabase CLI 필요)
supabase start && supabase db reset   # 마이그레이션 + seed 적용
# 단위 테스트
npm test
# 타입 체크
npm run typecheck
```

## 후속/주의 (Build & Test 단계 처리)
- ⚠️ `next@14.2.5` 보안 권고 — 패치 버전으로 업그레이드 필요(설치 시 npm 경고). Build & Test에서 패치 버전으로 상향.
- repository의 "신규 우선" 표시(US-3.1 NEW)는 정렬이 아닌 `is_new`(created_at=오늘) 계산으로 U3에서 표현. 현재 DB 정렬은 마감 임박(sort_apply_end) 기준 — 커서 안정성 우선. (설계 노트 반영)
- `upsert_notices`는 service_role 전용(anon 실행 revoke). U1 Edge Function에서 동일 RPC 재사용.
