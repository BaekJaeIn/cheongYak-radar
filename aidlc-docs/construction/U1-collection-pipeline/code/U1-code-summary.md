# U1 수집 파이프라인 — Code Summary

## v2 보강 (2026-06-24, 부부 추천 방향전환)
- `criteria.ts` (신규) — **CriteriaExtractor (C28)**: `extractSupplyTypes`(키워드→공급유형 라벨), `extractCriteria`(supplyTypes·소득%·총자산/자동차 한도·거주요건·청약통장·예비신혼/생애최초 베스트에포트, 신호 없으면 null), `REGION_SCOPE`/`isRegionInScope`(**C-6 서울·경기 한정**, sido null은 유지).
- `normalize.ts` — 범위 밖 시도 **드롭**(C-6) + `eligibility` 추출 적재(FR-9); `RawNotice.eligibilityText` 추가.
- `types.ts` — `EligibilityCriteria` 미러 + `NoticeInput.eligibility` 추가. Edge `upsert`는 0004 RPC로 그대로 전달(변경 불필요).
- 마이그레이션 `0004_eligibility_and_profile.sql`(U2) — `notices.eligibility` JSONB + `household_profile` 단일행 + upsert_notices 재정의(eligibility 적재).
- 테스트: `criteria.test.ts`(13) + `normalize.test.ts`(+4). **vitest 60 passed**, tsc clean.

## 생성 파일 (Created)

### Edge Function (Deno) — `supabase/functions/collect/`
- `region-alias.ts` — 생활권 별칭표(평촌→안양시 등) + `parseRegion` (순수)
- `normalize.ts` — `parseArea`/`inferNewlywed`/`mapPriority`/`normalize` (순수, BR-2~5)
- `types.ts` — `Collector`, `NoticeInput`(U2 미러), `makeNoticeId`
- `mock.ts` — `getMockNotices` 현실 세트 16건 (BR-7)
- `collectors/apply-home.ts` (apt), `lh.ts` (lh), `myhome-complex.ts` (보강), `sh.ts` (deno-dom 크롤링)
- `upsert.ts` — `upsert_notices` RPC 호출 (U2 계약)
- `summarize.ts` — Anthropic 요약(claude-opus-4-8, 상한 10, 비차단)
- `index.ts` — 진입점 `run()` + `Deno.serve` (모드결정→allSettled→upsert→요약→push→로깅)

### 마이그레이션
- `supabase/migrations/0003_collect_cron.sql` — pg_cron/pg_net + `collect-daily`(22:00 UTC=07:00 KST)

### 테스트
- `supabase/functions/collect/__tests__/normalize.test.ts` (16)
- `supabase/functions/collect/__tests__/mock.test.ts` (6)
- `vitest.config.ts` — include에 `supabase/functions/**/*.test.ts` 추가

## 스토리 추적
| Story | 상태 | 구현 |
|---|---|---|
| US-1.1 cron | ✅ | index.ts + 0003 |
| US-1.2 청약홈 | ✅ | collectors/apply-home.ts |
| US-1.3 LH | ✅ | collectors/lh.ts |
| US-1.4 단지정보 | ✅ | collectors/myhome-complex.ts |
| US-1.5 SH 크롤링 | ✅ | collectors/sh.ts (항목 skip) |
| US-1.6 에러 격리 | ✅ | index.ts allSettled |
| US-1.7 목업 | ✅ | mock.ts + isMockMode |

## 검증
- **단위 테스트**: `npx vitest run` → **43 passed** (U2 21 + U1 22). parseRegion 시도/시군구 분리 버그 1건 수정 후 통과.
- Deno 런타임 점검(deno-dom/jsr import, Edge 배포)은 Build & Test에서 수행.

## 주의/후속
- 실 API 필드명은 **잠정**(source-mapping.md) — `COLLECT_MODE=live` 전환 시 실제 응답으로 확정 필요.
- `triggerPush`는 U5 PushDispatcher 연계 지점(현재 로그만) — U5에서 구현.
- 요약은 U4 사양 기준 — 프롬프트/모델은 U4에서 정교화 가능.
- pg_cron URL/service_role 키는 배포 시 DB 설정(`app.settings.*`)으로 주입(커밋 금지).
