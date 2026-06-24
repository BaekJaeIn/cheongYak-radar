# U6 프로필·자격매칭·추천 — Functional Design 계획

**입력**: unit-of-work.md(U6), stories.md(E6: US-6.1~6.7), components.md(C25 ProfileRepository, C26 EligibilityMatcher, C27 RecommendationEngine, C28 CriteriaExtractor[U1 보강 완료], 도메인 HouseholdProfile/EligibilityCriteria/MatchResult/Recommendation), requirements.md §12(FR-8~10)

아래 **질문(Q-FU6-1 ~ Q-FU6-6)** 의 `[Answer]:` 태그에 보기(A/B/C…)를 적고, 완료되면 "완료"라고 알려주세요.
답변 분석 후 domain-entities.md / business-rules.md / business-logic-model.md를 생성합니다.
> U6의 UI(C29~C32: ProfileForm·RecommendationFeed·EligibilityBadge·MatchReasonView)는 **U3/U4 UI 단위**에서 frontend-components로 설계합니다. 본 단계는 **엔진(프로필·매칭·추천) 비즈니스 로직**에 집중 → frontend-components.md는 생성하지 않습니다.

---

## 생성될 산출물
- [x] `construction/U6-recommendation/functional-design/domain-entities.md` — HouseholdProfile·EligibilityCriteria·MatchResult·Recommendation·CriteriaTable(config) 엔티티·필드·관계
- [x] `construction/U6-recommendation/functional-design/business-rules.md` — 자격 판정 규칙(공급유형별), 정보부족 처리, 점수 가중, 신규추천 정의, RLS/저장 규칙
- [x] `construction/U6-recommendation/functional-design/business-logic-model.md` — ProfileRepository·EligibilityMatcher·RecommendationEngine 로직 흐름 + 수집 연계(신규추천 diff)

**답변(반영 완료)**: Q-FU6-1=A · Q-FU6-2=A · Q-FU6-3=A · Q-FU6-4=A · Q-FU6-5=A · Q-FU6-6=B(임대 포함 전체)

---

## 결정이 필요한 질문

### Q-FU6-1. 추천 계산·저장 전략
자격 판정/점수를 언제 계산하고 결과를 저장할지. (US-6.2 재계산, US-6.7 신규추천 Push와 직결)

A) **수집(collect) 후 서버에서 일괄 재계산 → `recommendations` 테이블에 저장**. 화면은 저장된 결과를 읽음. 신규 자격 발생(diff) 감지가 쉬워 US-6.7 Push에 유리 — *추천*

B) **화면 열 때 on-demand 계산**(저장 안 함). 단순하지만 신규추천 diff·Push가 어려움

C) **하이브리드**: 평소 on-demand + 수집 시 신규추천만 별도 계산해 Push

[Answer]: A

---

### Q-FU6-2. 정보 부족(미입력 프로필 / 미추출 자격조건) 시 판정 정책
프로필에 빈 항목(O-1~O-5)이 있거나 공고 eligibility가 베스트에포트라 비어 있을 때, 자격 판정을 어떻게?

A) **조건부 통과(lean inclusive)** — 확정 불가 항목은 "확인 필요"로 표기하되 일단 후보에 포함. 놓치는 공고 최소화 — *추천*

B) **엄격 제외** — 한 항목이라도 충족 미확인이면 부적합 처리(누락 위험↑)

C) **혼합** — 핵심 조건(무주택·지역)만 미충족 시 제외, 나머지 불명확은 조건부 통과

[Answer]: A

---

### Q-FU6-3. 자격 기준표(config) 형식·기준연도 (US-6.4, FR-9.3)
도시근로자 월평균소득·총자산·자동차가액 한도 등 기준표를 어디에 둘지.

A) **리포 내 연도별 파일**(예: `src/config/criteria-2026.ts` 또는 JSON), 코드에서 로드 — 버전관리·변경 추적 용이 — *추천*

B) **DB 테이블**(criteria_table) — 런타임 수정 가능하나 단일 가구엔 과함

C) **코드 상수**(파일 분리 없이 엔진 내 하드코딩)

[Answer]: A

---

### Q-FU6-4. 추천 점수 가중치 (FR-10.1)
점수 = 청약순위 · 소득여유 · 거주가점 · 희망지역 일치 · 면적 적합 · 마감임박 가중 합. 가중치를 어떻게 정할까요?

A) **기본 가중치 세트(제안값)로 시작**하고 config로 분리해 추후 조정 — 예: 희망지역40·자격여유20·면적15·청약순위15·마감임박10 — *추천*

B) **지금 직접 지정**(아래 [Answer]에 가중치 명시)

[Answer]: A

---

### Q-FU6-5. 추천 사유 생성 방식 (US-6.6, FR-10.4)
"왜 유리/부적합한지" 사유를 어떻게 만들까요?

A) **규칙 기반 템플릿**(점수 기여 요인을 문장화, 무비용·즉시) + 필요 시 Claude 요약 보강(선택) — *추천*

B) **항상 Claude 생성**(자연스럽지만 비용·지연)

C) **규칙 템플릿만**(Claude 미사용)

[Answer]: A

---

### Q-FU6-6. 자격 판정 대상 공급유형 범위
어떤 공급유형까지 판정·추천 대상으로?

A) **분양/공공 중심 핵심**: 신혼부부 특별공급·신혼희망타운·생애최초·일반공급·무순위(줍줍) — *추천*

B) **임대 포함 전체**: 위 + 행복주택·국민임대·장기전세·민간임대 등 (우리 부부는 예비신혼·무주택이라 임대도 후보)

C) Other (please describe after [Answer]: tag below)

[Answer]: B — 임대 포함 전체. 예비신혼·무주택이라 행복주택·국민임대·장기전세·민간임대도 추천 후보에 포함.
