# U6 프로필·자격매칭·추천 — Code Generation 계획 (PART 1)

**워크스페이스 루트**: `/Users/baekjaein/git-repo/cheongYak-radar`
**단위**: U6 (프로필·자격매칭·추천). **구현 스토리**: US-6.1~6.7 (FR-8~10).
**설계 입력**: U6 functional-design(BR-U6-1~17), infrastructure-design(0005, recompute in collect, criteria TS, /api/profile).
**기존 자산 재사용**: 타입 `src/lib/types/profile.ts`·`notice.ts(EligibilityCriteria)`, `criteria.ts(CriteriaExtractor)`, 0004(household_profile + upsert_household_profile), U1 collect index.ts(triggerPush 훅).

> 엔진(matcher/scorer)은 **순수 모듈** → Deno/Node 공통, vitest 테스트. 인프라 결정대로 엔진은 Edge(`collect/recommend/`)에 두고 프로필 변경 재계산은 Route Handler가 collect의 `recompute` 액션 호출(로직 중복 방지).

---

## 생성 단계 (PART 2)

### Step 1: 엔진 타입 + 기준표/가중치 config
- [x] `supabase/functions/collect/recommend/types.ts` — `CriteriaTable`, `MatchResult`, `SupplyTypeMatch`, `Recommendation`, `Weights` (notice/profile 타입은 collect/types.ts·미러 재사용)
- [x] `supabase/functions/collect/recommend/criteria-2026.ts` — `CriteriaTable` 상수(가구원수별 소득기준·유형별 %·자산/자동차 한도·거주기간 기본). 공개용 **대표값 + "확인 필요" 주석**(개인 수치 아님)
- [x] `supabase/functions/collect/recommend/weights.ts` — 기본 가중치(BR-U6-10)

### Step 2: EligibilityMatcher (순수) — FR-9
- [x] `supabase/functions/collect/recommend/matcher.ts` — `evaluate(notice, profile, table): MatchResult` (BR-U6-1~8: 선결조건·소득·자산·통장·거주·예비신혼/생애최초·정보부족 conditional·유형범위)

### Step 3: RecommendationEngine (순수) — FR-10
- [x] `supabase/functions/collect/recommend/scorer.ts` — `rank(matches, notices, profile, weights): Recommendation[]` (BR-U6-9~12: 후보·가중점수·정렬·규칙 사유)

### Step 4: RecommendationService (Deno, service_role) — BR-U6-13~15
- [x] `supabase/functions/collect/recommend/service.ts` — `recompute(client)`: 프로필·notices(서울·경기·미마감) 로드 → matcher → scorer → `upsert_recommendations` RPC → prune → newIds 반환. 프로필 미입력 시 no-op.

### Step 5: 마이그레이션 0005 — 인프라 1.1/1.2
- [x] `supabase/migrations/0005_recommendations.sql` — `recommendations` 테이블 + score 인덱스 + RLS(anon read, service write) + `upsert_recommendations(jsonb)`(firstRecommendedAt 보존, was_inserted 반환) + `prune_recommendations(text[])`

### Step 6: collect 통합 — 인프라 2.1/6
- [x] `supabase/functions/collect/index.ts` 수정 — 수집 후 `recommend.recompute` 단계 + 신규추천 `newIds` → triggerPush. `{ action: "recompute" }` 요청이면 수집 생략하고 재계산만(프로필 변경용)

### Step 7: 프로필 Route Handler (Node) — 인프라 4
- [x] `src/features/profile/repository.ts` — `getProfile()/saveProfile()` (admin 클라이언트 + upsert_household_profile RPC)
- [x] `src/app/api/profile/route.ts` — GET/PUT. PUT 저장 후 collect `recompute` 액션 트리거(US-6.2)

### Step 8: 단위 테스트 (순수 엔진) — vitest
- [x] `supabase/functions/collect/recommend/__tests__/matcher.test.ts` — 무주택/소득/거주/예비신혼/정보부족 conditional
- [x] `supabase/functions/collect/recommend/__tests__/scorer.test.ts` — 후보필터·가중점수·정렬·사유

### Step 9: 문서/요약
- [x] `aidlc-docs/construction/U6-recommendation/code/U6-code-summary.md`

---

## 스토리 추적
| Story | 구현 |
|---|---|
| US-6.1 프로필 입력/저장 | Step 7 (/api/profile, repository) |
| US-6.2 변경 시 재계산 | Step 6 recompute 액션 + Step 7 트리거 |
| US-6.3 자격 판정 | Step 2 matcher |
| US-6.4 기준표 config | Step 1 criteria-2026 |
| US-6.5 점수·정렬 | Step 3 scorer |
| US-6.6 추천 사유 | Step 3 buildReason |
| US-6.7 신규추천 Push | Step 4 newIds + Step 6 triggerPush |

## 총 9단계 · 앱코드 ~10파일 + 마이그레이션 1 + 테스트 2 + 문서 1. (기존 U2/U1 코드 보존)
