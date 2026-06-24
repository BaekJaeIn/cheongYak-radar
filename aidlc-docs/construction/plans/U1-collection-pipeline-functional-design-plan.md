# U1 수집 파이프라인 — Functional Design 계획

**입력**: unit-of-work.md(U1), story-map(US-1.1~1.7), components.md(C1~C4), U2 타입/`upsert_notices` RPC
**전제**: 현재 `COLLECT_MODE=mock` (Q2=B, API 키 미발급). 실 API 매핑은 잠정 정의.

아래 **질문(Q-FU1 ~ Q-FU4)** 의 `[Answer]:` 태그에 보기를 적고, 완료되면 "완료"라고 알려주세요.
답변 분석 후 business-logic-model.md / business-rules.md / domain-entities.md(매핑) 를 생성합니다.
> U1은 백엔드(Edge Function) 단위 → UI 없음, frontend-components.md 미생성.

---

## 생성될 산출물
- [x] `construction/U1-collection-pipeline/functional-design/business-logic-model.md` — Collector/Orchestrator/Mock/요약·푸시 트리거 흐름
- [x] `construction/U1-collection-pipeline/functional-design/business-rules.md` — 정규화/지역·면적 파싱/신혼 추론/에러격리 규칙
- [x] `construction/U1-collection-pipeline/functional-design/source-mapping.md` — 소스별 필드 매핑(잠정)

---

## 결정이 필요한 질문

### Q-FU1. 주소 → 지역(시도/시군구) 파싱 전략
공급위치/주소 문자열에서 region_sido/region_sigu를 어떻게 뽑을까요?

A) **간단 규칙 파서** — 정규식으로 "OO도/OO시" 추출 + 관심지역 별칭(평촌→안양시, 산본→군포시) 매핑 테이블 — *추천*

B) **외부 지오코딩 API** — 정확하지만 키/비용/지연 추가

C) **원본 그대로 저장만** — 파싱 없이 raw에 두고 필터는 텍스트 매칭

D) Other (please describe after [Answer]: tag below)

[Answer]: 

---

### Q-FU2. 신혼부부/예비신혼 추론 규칙
`newlywed`/`pre_newlywed`를 어떻게 판정할까요?

A) **키워드 규칙** — 공급유형/공고명에 "신혼", "신혼희망", "예비신혼" 포함 여부로 판정 — *추천*

B) **소스 필드 우선** — API가 제공하는 전용 필드만 사용(없으면 false)

C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

### Q-FU3. 목업 데이터 규모/구성 (US-1.7)
mock 모드 데이터를 어떻게 구성할까요?

A) **관심지역 중심 현실적 세트** — 안양/군포/의왕/서울, 4개 source 골고루, 마감 전/임박/마감 섞기(약 15~25건) — *추천*

B) **최소 세트** — source당 1~2건(스모크 테스트용)

C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

### Q-FU4. 요약(Claude) 생성 트리거 시점
파이프라인에서 자격요약을 언제 만들까요? (Q-A4=A 사전생성 전제)

A) **upsert 후, eligibility_summary가 비어있는 공고만 요약→재저장** — 신규/누락만, 비용 최소 — *추천*

B) **신규 삽입(inserted) 공고만 요약** — 더 보수적, 갱신으로 자격조건 바뀐 경우 누락 가능

C) **요약은 U4에서만(온디맨드)** — U1은 요약 안 함 (Q-A4 재논의)

D) Other (please describe after [Answer]: tag below)

[Answer]: 
