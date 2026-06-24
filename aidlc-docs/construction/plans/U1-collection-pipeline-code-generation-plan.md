# U1 수집 파이프라인 — Code Generation 계획 (PART 1)

**워크스페이스 루트**: `/Users/baekjaein/git-repo/cheongYak-radar`
**단위**: U1 수집 파이프라인 (Deno Edge Function)
**구현 스토리**: US-1.1~1.7
**의존**: U2(`upsert_notices` RPC, Notice 타입 계약). → U5(push 트리거는 U5에서 구현; U1은 인터페이스 호출 지점만).
**런타임**: Supabase Edge Function = **Deno**. `src/`(Node)와 분리.

> 코드는 워크스페이스 루트, 문서 요약만 `aidlc-docs/construction/U1-collection-pipeline/code/`.
> **테스트 전략**: 순수 모듈(normalize/region-alias/mock)은 Deno 의존 없이 작성 → vitest로 검증. deno-dom/URL import를 쓰는 모듈(sh/index/summarize/collectors)은 테스트 비대상(Build&Test에서 Deno로 점검).

---

## 생성 단계 (PART 2)

### Step 1: 지역 별칭 + 정규화 (순수, 테스트 대상) — BR-2~5
- [ ] `supabase/functions/collect/region-alias.ts` — 생활권명→행정구역 매핑 + `parseRegion`
- [ ] `supabase/functions/collect/normalize.ts` — `parseArea`, `inferNewlywed`, `mapPriority`, `normalize(raw, source)`

### Step 2: 타입 + 목업 (순수) — US-1.7
- [ ] `supabase/functions/collect/types.ts` — `Collector` 인터페이스, 공유 타입(Notice 미러)
- [ ] `supabase/functions/collect/mock.ts` — MockDataProvider, 현실 세트 15~25건 (BR-7)

### Step 3: 소스 Collector (Deno fetch / deno-dom) — US-1.2~1.5
- [ ] `supabase/functions/collect/collectors/apply-home.ts` (apt)
- [ ] `supabase/functions/collect/collectors/lh.ts` (lh)
- [ ] `supabase/functions/collect/collectors/myhome-complex.ts` (보강)
- [ ] `supabase/functions/collect/collectors/sh.ts` (deno-dom 파싱, 항목 skip)

### Step 4: 저장·요약 어댑터 — US-2.1 연계, BR-8
- [ ] `supabase/functions/collect/upsert.ts` — `upsert_notices` RPC 호출(service_role)
- [ ] `supabase/functions/collect/summarize.ts` — Anthropic 요약(상한 10), null 폴백

### Step 5: 오케스트레이터 진입점 — US-1.1, US-1.6
- [ ] `supabase/functions/collect/index.ts` — run(): 모드결정→allSettled 수집→upsert→요약→push 트리거→로깅

### Step 6: cron 마이그레이션 — US-1.1
- [ ] `supabase/migrations/0003_collect_cron.sql` — pg_cron/pg_net enable + `collect-daily`(22:00 UTC)

### Step 7: 단위 테스트 (순수 모듈) — vitest
- [ ] `vitest.config.ts` include에 `supabase/functions/**/*.test.ts` 추가
- [ ] `supabase/functions/collect/__tests__/normalize.test.ts` — parseRegion/별칭, parseArea, inferNewlywed, mapPriority
- [ ] `supabase/functions/collect/__tests__/mock.test.ts` — 목업 세트 불변식(소스 다양성·합성키·필드)

### Step 8: 문서/요약
- [ ] `aidlc-docs/construction/U1-collection-pipeline/code/U1-code-summary.md`

---

## 스토리 추적
| Story | 구현 |
|---|---|
| US-1.1 cron | Step 5 index, Step 6 0003 |
| US-1.2 청약홈 | Step 3 apply-home |
| US-1.3 LH | Step 3 lh |
| US-1.4 단지정보 | Step 3 myhome-complex |
| US-1.5 SH | Step 3 sh |
| US-1.6 에러 격리 | Step 5 allSettled |
| US-1.7 목업 | Step 2 mock |

## 총 8단계 · 예상: Deno 코드 ~11파일 + 마이그레이션 1 + 테스트 2 + 문서 1
