# U6 프로필·자격매칭·추천 — Code Summary

## 생성 파일 (Created)

### 추천 엔진 (Deno/Node 공통 순수) — `supabase/functions/collect/recommend/`
- `types.ts` — CriteriaTable·MatchResult·SupplyTypeMatch·Recommendation·Weights·HouseholdProfile(미러)
- `criteria-2026.ts` — 연도 기준표(대표/추정값 + "확인 필요" 주석), `loadCriteriaTable`, `NO_INCOME_LIMIT_TYPES`
- `weights.ts` — 기본 가중치(지역40·자격20·면적15·순위15·마감10)
- `matcher.ts` — **EligibilityMatcher** `evaluate()` (BR-U6-1~8: 무주택·소득·자산·통장·거주·예비신혼/생애최초·정보부족 conditional)
- `scorer.ts` — **RecommendationEngine** `rank()` (BR-U6-9~12: 후보·가중점수·정렬·규칙 사유) + regionScore/areaScore
- `service.ts` — **RecommendationService** `recompute(client)` (프로필+공고→매칭→점수→upsert/prune→newIds)

### DB
- `supabase/migrations/0005_recommendations.sql` — recommendations 테이블 + score 인덱스 + RLS(anon read/service write) + `upsert_recommendations`(firstRecommendedAt 보존·was_inserted) + `prune_recommendations`

### 통합 / 프로필 API
- `supabase/functions/collect/index.ts` (수정) — 수집 후 `recompute` 단계, **신규추천 newIds→triggerPush**, `{action:"recompute"}` 분기(수집 생략 재계산)
- `src/features/profile/repository.ts` — getProfile/saveProfile (admin, upsert_household_profile RPC)
- `src/app/api/profile/route.ts` — GET/PUT, 저장 후 recompute 트리거 (Node runtime, service_role 서버 전용)

### 테스트
- `recommend/__tests__/matcher.test.ts` (8) · `recommend/__tests__/scorer.test.ts` (9)

## 스토리 추적
| Story | 상태 | 구현 |
|---|---|---|
| US-6.1 프로필 입력/저장 | ✅ | route.ts + repository |
| US-6.2 변경 시 재계산 | ✅ | PUT→recompute 액션 |
| US-6.3 자격 판정 | ✅ | matcher.ts |
| US-6.4 기준표 config | ✅ | criteria-2026.ts |
| US-6.5 점수·정렬 | ✅ | scorer.ts |
| US-6.6 추천 사유 | ✅ | scorer buildReason |
| US-6.7 신규추천 Push | ✅ | service newIds + index triggerPush(U5 실제 발송 대기) |

## 검증
- **단위 테스트**: `npx vitest run` → **77 passed** (기존 60 + U6 17). 무주택/소득초과/예비신혼/정보부족 conditional/후보필터/정렬/점수범위 커버.
- **타입체크**: `npx tsc --noEmit` → 에러 없음(Node 측 route/repository 포함).
- 마이그레이션 0005·RLS·RPC 실DB 검증은 Build & Test에서 `supabase db reset`으로 수행 예정.

## 주의/후속
- 기준표 수치는 **대표/추정값** — 실제 적용 전 연도 고시 기준 확인(criteria-2026.ts 주석). 개인 수치 아님.
- 추천 사유 Claude 보강(BR-U6-12)은 선택 훅 — 현재 규칙 템플릿만으로 완결, 필요 시 summarize 패턴 재사용.
- US-6.7 실제 Push 발송은 **U5 PushDispatcher** 구현 시 연결(현재 triggerPush no-op 로그).
- `/api/profile`는 첫 app 라우트 — 전체 `next build`에는 U3에서 root layout/페이지 추가 필요(엔진/테스트는 무관).
