# 청약레이더 — User Story 생성 계획 (PART 1: Planning)

**역할**: Product Owner
**입력**: requirements.md (FR-1..7, NFR-1..8), user-stories-assessment.md

아래 **질문(Q-S1 ~ Q-S5)** 의 `[Answer]:` 태그에 보기 알파벳을 적어주세요.
모두 작성하면 "완료"라고 알려주세요. 답변을 분석한 뒤 stories.md / personas.md를 생성합니다.

---

## A. 생성될 산출물 (고정 — 항상 생성)

- [x] `aidlc-docs/inception/user-stories/stories.md` — INVEST 기준 사용자 스토리 + 수용 기준(AC)
- [x] `aidlc-docs/inception/user-stories/personas.md` — 사용자 페르소나/아키타입
- [x] 각 스토리에 수용 기준(Given/When/Then) 포함
- [x] 페르소나 ↔ 스토리 매핑

## B. 실행 체크리스트 (PART 2에서 수행)

- [x] 요구사항(FR/NFR)을 스토리 후보로 분해
- [x] 페르소나 정의
- [x] 스토리 작성 (INVEST + AC)
- [x] 페르소나-스토리 매핑표 작성
- [x] Epic/그룹으로 구조화
- [x] INVEST 준수 검토

---

## C. 결정이 필요한 질문

### Q-S1. 스토리 분해(Breakdown) 방식

어떤 방식으로 스토리를 구성할까요?

A) **Feature-Based** — 시스템 기능(수집/목록/상세/필터/북마크/PWA·알림) 중심으로 그룹화

B) **User Journey-Based** — 사용자 흐름(아침 확인 → 필터 → 상세 검토 → 북마크 → 알림) 중심

C) **Epic-Based 하이브리드** — Epic(수집 파이프라인 / 탐색·필터 / 상세·AI / 개인화·PWA)으로 묶고 하위 스토리 — _추천_

D) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Q-S2. 페르소나 구성

개인용 도구지만 사용 맥락이 다양합니다. 페르소나를 어떻게 둘까요?

A) **단일 페르소나** — "신혼부부 청약 준비자(본인)" 하나로 단순화

B) **2개 페르소나** — 주 사용자(신혼부부 청약 준비자) + 시스템/자동수집 관점(데이터 파이프라인 운영자) — _추천_

C) **3개 이상** — 주 사용자 + 가족 공유자 + 운영자 등 세분화

D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Q-S3. 수용 기준(Acceptance Criteria) 형식

AC를 어떤 형식으로 작성할까요?

A) **Given/When/Then** (Gherkin 스타일) — 테스트 자동화 친화적 — _추천_

B) **체크리스트형** — 간결한 불릿 조건 목록

C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q-S4. 스토리 상세도(Granularity)

스토리 크기를 어느 정도로 할까요?

A) **굵게(Epic+소수 스토리)** — 빠른 진행 우선, 화면 단위 큰 스토리

B) **중간** — 화면/기능 단위로 적절히 분할 (예: "목록 필터링", "D-day 배지" 분리) — _추천_

C) **잘게** — 작은 단위로 세분화 (백로그 정밀관리용)

D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Q-S5. 우선순위 표기

스토리에 우선순위/볼트 매핑을 표기할까요?

A) **예 — SPEC 볼트(1~7) 번호와 우선순위(MoSCoW: Must/Should/Could)를 각 스토리에 표기** — _추천_

B) 아니오 — 우선순위 없이 스토리만 작성

C) Other (please describe after [Answer]: tag below)

[Answer]: A
