# U6 프로필·자격매칭·추천 — Business Logic Model

> 컴포넌트 로직 흐름(기술 비종속). C25 ProfileRepository · C26 EligibilityMatcher · C27 RecommendationEngine + 수집 연계. C28 CriteriaExtractor는 U1에서 구현 완료(소유는 U6).

---

## C25. ProfileRepository — 가구 프로필 1건 (FR-8)
단일 가구(id=1) CRUD. household_profile(0004) 경유, service_role.

- `get(): HouseholdProfile | null` — 단일행 조회. 없으면 null(최초 미입력).
- `save(profile): HouseholdProfile` — `upsert_household_profile(p)` RPC 호출(단일행 보장). 저장 후 BR-U6-13(b) 재계산 트리거.
- **검증**: members ≥ 1, monthlyIncome ≥ 0, since ≤ today, areaMin ≤ areaMax. 누락 항목은 허용(BR-U6-7).

```text
ProfileForm(C29, U3/U4) ─save→ ProfileRepository.save ─RPC→ household_profile
                                        └─► RecommendationService.recomputeAll()
```

---

## C26. EligibilityMatcher — 공고 × 프로필 판정 (FR-9)
`evaluate(notice, profile, criteriaTable): MatchResult` (순수 함수, 테스트 용이)

흐름:
1. 핵심 선결 조건 평가(BR-U6-1): 무주택·지역. 명확 미충족 → 전체 ineligible 반환.
2. 대상 공급유형 산출(BR-U6-8): `notice.eligibility.supplyTypes` ∩ 허용목록(임대 포함). 비면 추론/일반공급 가정.
3. 각 유형마다 조건 평가 → `SupplyTypeMatch{ type, status, reasons }`:
   - 소득(BR-U6-2)·자산/자동차(BR-U6-3)·통장(BR-U6-4)·거주(BR-U6-5)·예비신혼/생애최초(BR-U6-6).
   - 미충족 명확 → ineligible + 사유. 정보 부족 → conditional + "확인 필요"(BR-U6-7). 전부 충족 → eligible.
4. `anyEligible = perSupplyType.some(status ∈ {eligible, conditional})`.

```text
evaluate(notice, profile, table):
  if !preconditionsPass(notice, profile) → all ineligible
  types = resolveSupplyTypes(notice)
  for t in types: status,reasons = evalType(t, notice, profile, table)
  return { noticeId, perSupplyType, anyEligible }
```

순수성: 외부 I/O 없음. 입력(notice·profile·table) → 출력(MatchResult)만. → vitest 단위 테스트.

---

## C27. RecommendationEngine — 점수·정렬·사유 (FR-10)
`rank(matches: MatchResult[], notices, profile, weights): Recommendation[]` (순수)

흐름:
1. 후보 필터(BR-U6-9): anyEligible && !마감.
2. 각 후보 점수화(BR-U6-10): 요인별 점수 × 가중치 → `scoreBreakdown` + `score`(0~100 정규화).
3. 정렬(BR-U6-11): score desc → apply_end asc → noticeId.
4. 사유 생성(BR-U6-12): `buildReason(breakdown, match)` 규칙 템플릿. (선택) Claude 보강 훅.
5. `Recommendation{ noticeId, score, eligibleTypes, reasonSummary, scoreBreakdown }[]` 반환.

```text
rank(matches, notices, profile, weights):
  cands = matches.filter(anyEligible && !expired)
  scored = cands.map(m => ({...score(m, notice, profile, weights)}))
  return scored.sort(byScoreThenDeadline).map(withReason)
```

순수 함수 → 가중치/입력 고정 시 결정적. weights는 config(BR-U6-10) 주입.

---

## S6. RecommendationService — 오케스트레이션 (서버 측)
수집/프로필 변경과 엔진을 잇는 서비스. service_role.

### recomputeAll() — 전체 재계산 (BR-U6-13 b/c)
```text
profile = ProfileRepository.get(); if null → 종료(추천 불가)
table   = loadCriteriaTable(currentYear)         // src/config/criteria-YYYY
notices = NoticeRepository.listInScope()         // 서울·경기, 미마감 우선
matches = notices.map(n => EligibilityMatcher.evaluate(n, profile, table))
recs    = RecommendationEngine.rank(matches, notices, profile, weights)
prevIds = recommendations.allIds()
upsert recommendations(recs)   // firstRecommendedAt 보존, computedAt 갱신
remove recommendations ∉ recs  // 탈락 정리(BR-U6-14)
newIds  = recs.ids − prevIds   // 신규추천(BR-U6-15)
return { count: recs.length, newIds }
```

### recomputeForCollected(collectedIds, newIds) — 수집 직후 (BR-U6-13 a)
- collect의 결과(신규/갱신 공고)를 받아 해당 공고 + 영향 범위 재계산.
- 산출된 **신규 추천 newIds** → U5 PushDispatcher로 전달(US-6.7). (U1 index.ts의 triggerPush 연계 지점 확장)

```text
[collect run] ─inserted/updated→ RecommendationService.recomputeForCollected
                                          └─ newRecommendationIds → PushDispatcher(U5)
```

### onProfileChanged() → recomputeAll() (US-6.2)

---

## 데이터 흐름 요약

```text
U1 collect ──► notices(+eligibility) ──┐
프로필 입력 ──► household_profile ──────┤
config/criteria-YYYY ──────────────────┤
                                       ▼
                        RecommendationService.recompute
                          ├─ EligibilityMatcher (C26)
                          └─ RecommendationEngine (C27)
                                       ▼
                            recommendations 테이블
                              ├─► U3 RecommendationFeed (점수순)
                              ├─► U4 EligibilityBadge / MatchReasonView
                              └─► U5 Push (신규추천 newIds)
```

---

## 오류·경계 처리
- 프로필 미입력 → 추천 계산 스킵, 화면은 "프로필을 입력하세요" 안내(빈 추천).
- criteriaTable 연도 누락 → 직전 연도 fallback + 경고 로그.
- EligibilityMatcher는 공고 단위 격리: 한 공고 평가 실패가 전체 재계산을 막지 않음(allSettled 패턴, U1 BR-6 준용).
- Claude 사유 보강 실패 → 규칙 템플릿 사유로 폴백(비차단, BR-U6-12).
