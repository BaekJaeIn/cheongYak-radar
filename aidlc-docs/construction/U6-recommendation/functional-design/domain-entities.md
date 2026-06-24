# U6 프로필·자격매칭·추천 — Domain Entities

> 기술 비종속. 자격매칭·추천 엔진의 도메인 모델. 입력 결정: Q-FU6-1=A(precompute+persist), Q-FU6-2=A(조건부 통과), Q-FU6-3=A(연도별 config 파일), Q-FU6-4=A(기본 가중치), Q-FU6-5=A(규칙 템플릿+선택 Claude), Q-FU6-6=B(임대 포함 전체).
> 근거: components.md(C25~C28, 공유 도메인 모델), requirements.md §12(FR-8~10), stories E6.

---

## E1. HouseholdProfile (가구 프로필) — 단일 가구 1건
src/lib/types/profile.ts에 구현됨(0004 household_profile JSONB 저장). 자격·점수의 입력.

| 필드 | 타입 | 설명 |
|---|---|---|
| maritalStatus | `single\|pre_newlywed\|newlywed\|married` | 혼인상태. 예비신혼 자격(입주 전 혼인) 판정 |
| homeless | boolean | 세대 전원 무주택 여부 (핵심 조건) |
| headOfHousehold | boolean | 세대주 여부 |
| children | number | 자녀 수 (다자녀·우선순위 가점) |
| members | number | 세대 구성원 수 (소득 기준표 가구원수 매핑) |
| self / partner | Member | 각자 birthYear·monthlyIncome·savingsAccount |
| assets | `{ financial, carValue }` | 금융자산·자동차가액(원). 자산 한도 평가 |
| residence | `{ sido, sigu, since }` | 거주지·전입일(YYYY-MM-DD). 거주기간·해당지역 판정 |
| firstTimeBuyer | boolean | 생애최초 대상 여부 |
| preferences | ProfilePreferences | areaMin/areaMax·regions[]·sources[] (관심지역 가산점) |

**Member**: `{ birthYear, monthlyIncome, savingsAccount?: { type, count, amount } }`
**파생값**: `combinedIncome = self.monthlyIncome + partner.monthlyIncome` (부부합산, A-2), `residenceMonths = months(today − residence.since)`.

---

## E2. EligibilityCriteria (공고별 자격조건) — notices.eligibility(JSONB)
U1 CriteriaExtractor(C28)가 베스트에포트 적재. src/lib/types/notice.ts 구현됨. 모든 필드 선택적.

| 필드 | 타입 | 설명 |
|---|---|---|
| supplyTypes | string[] | 공급유형 라벨(신혼희망타운·신혼부부특별공급·생애최초·일반공급·무순위·행복주택·국민임대·영구임대·장기전세·청년·민간임대) |
| incomePctLimit | number? | 도시근로자 월평균소득 대비 한도(%) |
| assetLimit | number? | 총자산 한도(원) |
| carLimit | number? | 자동차가액 한도(원) |
| residencyReq | `{ region, months }?` | 거주요건(지역/기간) |
| savingsReq | `{ months, count }?` | 청약통장(가입기간/납입횟수) |
| preNewlywedAllowed | boolean? | 예비신혼 신청 가능 |
| firstTimeEligible | boolean? | 생애최초 대상 |

> 비어 있는 필드 → Q-FU6-2=A 정책으로 "확인 필요(unknown)" 처리(엄격 제외 아님).

---

## E3. CriteriaTable (연도별 기준표 config) — Q-FU6-3=A
리포 내 연도별 파일(예: `src/config/criteria-2026.ts`). EligibilityMatcher가 참조하는 법정 기준값.

| 필드 | 타입 | 설명 |
|---|---|---|
| year | number | 적용 연도(예 2026) |
| incomeBaseByHouseholdSize | `Record<number, number>` | 가구원수별 도시근로자 월평균소득 100% 기준액(원) |
| incomePctByType | `Record<string, number>` | 공급유형별 소득 한도 기본%(공고 미명시 시 fallback) |
| assetLimitByType | `Record<string, number>` | 공급유형별 총자산 한도 기본값(원) |
| carLimit | number | 자동차가액 한도 기본값(원) |
| defaultResidencyMonths | number | 해당지역 우선공급 거주기간 기본 가정(개월) |

> 기준액의 **상세 수치는 로컬 전용 household-profile.md / 별도 config 작성 시점에 확정**(공개 레포에는 구조/샘플만). 미확정 항목은 A-2(8월 이후 재평가) 따른다.

---

## E4. MatchResult (자격 판정 결과) — 공고 1건 × 프로필
EligibilityMatcher.evaluate 산출. components.md 정의 확장.

| 필드 | 타입 | 설명 |
|---|---|---|
| noticeId | string | 대상 공고 id |
| perSupplyType | `SupplyTypeMatch[]` | 공급유형별 판정 |
| anyEligible | boolean | 하나라도 eligible(또는 조건부 통과) |

**SupplyTypeMatch**: `{ type: string, status: 'eligible'|'conditional'|'ineligible', reasons: string[] }`
- `eligible`: 모든 확인 가능한 조건 충족. `conditional`: 일부 정보 부족(Q-FU6-2=A). `ineligible`: 핵심 조건 명확 미충족.

---

## E5. Recommendation (추천 항목) — recommendations 테이블에 저장(Q-FU6-1=A)
RecommendationEngine.rank 산출 + 영속화.

| 필드 | 타입 | 설명 |
|---|---|---|
| noticeId | string | 공고 id (PK, household 1건이므로 noticeId 단독) |
| score | number | 0~100 정규화 점수 |
| eligibleTypes | string[] | eligible/conditional 공급유형 |
| reasonSummary | string | 추천 사유 요약(규칙 템플릿, 선택적 Claude 보강) |
| scoreBreakdown | `Record<string, number>` | 요인별 기여(희망지역·자격여유·면적·청약순위·마감임박) — 디버그/사유용 |
| firstRecommendedAt | timestamptz | 최초 추천 시각(신규추천 diff·Push 기준, US-6.7) |
| computedAt | timestamptz | 마지막 계산 시각 |

**관계**: Recommendation.noticeId → Notice.id (U2). 단일 가구이므로 household FK 불필요(또는 profile_id=1 고정).

---

## 엔티티 관계 (텍스트 다이어그램)

```text
HouseholdProfile(1건) ──┐
                        ├─► EligibilityMatcher ─► MatchResult(공고별)
Notice.eligibility ─────┘                              │
CriteriaTable(연도) ────────────────────────────────────┘
                                                       ▼
                                   RecommendationEngine ─► Recommendation(저장)
                                                       │
                                   (computedAt diff) ──► 신규추천 → U5 Push (US-6.7)
```
