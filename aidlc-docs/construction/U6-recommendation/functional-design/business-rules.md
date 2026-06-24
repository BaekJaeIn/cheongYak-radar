# U6 프로필·자격매칭·추천 — Business Rules

> 기술 비종속 규칙. 결정 반영: Q1=A(precompute+persist), Q2=A(조건부 통과), Q3=A(연도 config), Q4=A(기본 가중치), Q5=A(규칙+선택 Claude), Q6=B(임대 포함 전체).

---

## A. 자격 판정 규칙 (EligibilityMatcher, FR-9)

### BR-U6-1. 핵심 선결 조건 (모든 공급유형 공통)
공급유형 판정 전, 다음 미충족이 **명확**하면 즉시 `ineligible`:
- **무주택**: `profile.homeless === false` → 무주택 요건 있는 유형 전부 ineligible.
- **지역**: 공고 `region_sido`가 서울·경기 밖 → 대상 외(수집에서 이미 드롭, C-6).
정보가 없으면(불명확) ineligible로 단정하지 않음(BR-U6-7).

### BR-U6-2. 소득 기준 (incomePctLimit)
- 한도% = `notice.eligibility.incomePctLimit` ?? `criteriaTable.incomePctByType[type]`.
- 기준액 = `criteriaTable.incomeBaseByHouseholdSize[profile.members]` × (한도%/100).
- `combinedIncome(부부합산, A-2) ≤ 기준액` → 충족. 초과 → 사유 "소득 기준 초과".
- 한도%·기준액 어느 하나라도 미상 → `conditional` + 사유 "소득 기준 확인 필요".

### BR-U6-3. 자산·자동차 기준
- `assetLimit` 존재 시 `profile.assets.financial ≤ assetLimit`, 초과 → 미충족 사유.
- `carLimit`(공고 또는 config) 대비 `profile.assets.carValue` 평가. 미상 → conditional.

### BR-U6-4. 청약통장 (savingsReq)
- 본인 단독 명의 가정(A-1, 유리한 통장 선택). `savingsAccount.count ≥ savingsReq.count` 및 가입기간 ≥ `savingsReq.months`.
- 통장 정보 미입력 → conditional "청약통장 조건 확인 필요".

### BR-U6-5. 거주요건 (residencyReq) — 해당지역 우선공급
- `residenceMonths ≥ residencyReq.months`이면 해당지역 우선 자격. 부천 거주(2026-04 전입, A-3) → 대체로 **미충족**.
- 미충족이라도 **경기·수도권 일반 자격**은 유지(우선공급만 배제) → 유형은 ineligible 아님, 거주가점만 0.

### BR-U6-6. 예비신혼 / 생애최초 (조건부, A-4)
- `maritalStatus === 'pre_newlywed'`:
  - `preNewlywedAllowed`/신혼 계열 → eligible(입주 전 혼인 전제, 사유에 "혼인신고 후 신청" 명시).
  - **생애최초 특공**(`firstTimeEligible`) → `conditional`(혼인 후 자격, A-4).
- `firstTimeBuyer === true` + 생애최초 유형 → 소득·자산 충족 시 eligible.

### BR-U6-7. 정보 부족 처리 정책 (Q-FU6-2=A, lean inclusive)
- 조건 평가에 필요한 **프로필/공고 데이터가 없으면** 해당 조건은 `unknown` → 유형 상태를 한 단계만 낮춰 `conditional`(제외 아님).
- **핵심 조건(무주택·지역)이 명확히 미충족**일 때만 `ineligible`.
- 모든 `conditional`/`eligible` 유형은 추천 후보에 포함하고, reasons에 "확인 필요" 항목을 나열.

### BR-U6-8. 판정 대상 공급유형 범위 (Q-FU6-6=B, 임대 포함 전체)
분양/공공 + 임대 모두 판정:
- 분양/공공: `신혼부부특별공급`, `신혼희망타운`, `생애최초`, `일반공급`, `무순위`.
- 임대: `행복주택`, `국민임대`, `영구임대`, `장기전세`, `민간임대`, `청년`.
- 평가 대상 유형 = `notice.eligibility.supplyTypes` ∩ (위 목록). supplyTypes 비면 제목 기반 추론(CriteriaExtractor) 결과 사용, 그래도 없으면 `일반공급`으로 가정(conditional).

---

## B. 추천 점수 규칙 (RecommendationEngine, FR-10)

### BR-U6-9. 후보 선정
- `MatchResult.anyEligible === true`(eligible 또는 conditional 하나 이상)인 공고만 추천 후보.
- 마감(`apply_end < today`) 공고는 기본 제외(설정으로 표시 가능, U3 보조 필터).

### BR-U6-10. 점수 가중치 (Q-FU6-4=A, 기본 세트 — config 분리)
`score = Σ(요인점수 × 가중치)`, 0~100 정규화. 기본 가중치:

| 요인 | 가중 | 산출 |
|---|---|---|
| 희망지역 일치 | 40 | 관심지역(preferences.regions) 포함=1.0, 동일 시도=0.5, 그 외 서울·경기=0.2 (A4=A) |
| 자격 여유 | 20 | eligible=1.0, conditional=0.5; 소득 여유율(기준액 대비) 가산 |
| 면적 적합 | 15 | [areaMin,areaMax] ∩ 공고 면적 겹치면 1.0, 인접 0.5, 무관 0 |
| 청약 순위 | 15 | 1순위=1.0, 2순위=0.5, 무순위=0.3 |
| 마감 임박 | 10 | D-7 이내 1.0 → D-30 선형 감소(신청 기회 강조) |

> 가중치는 `src/config/recommendation-weights.ts` 등으로 분리하여 추후 조정(Q4=A).

### BR-U6-11. 정렬
- 1차: score 내림차순. 2차 동점: apply_end 오름차순(마감 임박 우선), 3차: noticeId.

### BR-U6-12. 추천 사유 (Q-FU6-5=A)
- 규칙 템플릿으로 `scoreBreakdown` 상위 기여 요인 2~3개를 문장화(예: "관심지역(안양) + 1순위 + 면적 적합").
- conditional 사유(확인 필요 항목)도 함께 표기.
- **선택적 Claude 보강**: 비용/지연 허용 시 reasonSummary를 자연어로 다듬음(U1 summarize.ts 패턴 재사용, 상한·비차단). 기본은 규칙 템플릿만으로 완결.

---

## C. 재계산 · 영속화 · 신규추천 (Q-FU6-1=A)

### BR-U6-13. 재계산 트리거
- (a) 수집(collect) 직후 신규/갱신 공고 대상 일괄 재계산.
- (b) 프로필 저장/변경 시 전체 재계산(US-6.2).
- (c) 기준표(config) 연도 전환 시 전체 재계산.

### BR-U6-14. 영속화
- 결과를 `recommendations`에 upsert. `firstRecommendedAt`은 최초 1회만 설정(보존), `computedAt`은 매번 갱신.
- 후보에서 탈락한 공고의 기존 추천 레코드는 제거 또는 비활성(마감/자격상실).

### BR-U6-15. 신규 추천 정의 (US-6.7, FR-10.3)
- **신규 추천** = 이번 재계산에서 `recommendations`에 **새로 삽입**된 noticeId(직전에 없던 것). → U5 PushDispatcher 대상.
- 점수 변동만으로는 Push하지 않음(신규 자격 발생 시에만).

---

## D. 저장·보안 규칙

### BR-U6-16. 프로필 접근 (민감정보)
- `household_profile`(0004)는 RLS로 anon 차단. 읽기/쓰기는 service_role 경유 서버 코드만(`upsert_household_profile` RPC, ProfileRepository).
- 매칭·점수 계산은 **서버 측**(service_role)에서 수행 → 클라이언트로 프로필 원본 미노출.

### BR-U6-17. 추천 결과 노출
- `recommendations`는 점수·사유·eligibleTypes 등 비민감 정보 → 익명 읽기 허용 가능(인프라 설계에서 RLS 확정). 단일 가구 개인앱이므로 노출 범위는 인프라 단계 결정.
