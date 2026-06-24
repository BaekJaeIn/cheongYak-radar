# 청약레이더 — Unit of Work 계획 (PART 1: Planning)

**입력**: requirements.md, stories.md(24/5 Epic), application-design.md(U1~U5 윤곽)

아래 **질문(Q-U1 ~ Q-U3)** 의 `[Answer]:` 태그에 보기를 적고, 완료되면 "완료"라고 알려주세요.
답변 분석 후 unit-of-work.md / unit-of-work-dependency.md / unit-of-work-story-map.md를 생성합니다.

---

## 생성될 산출물 (항상 생성)
- [x] `application-design/unit-of-work.md` — 단위 정의·책임·코드 조직 전략(greenfield)
- [x] `application-design/unit-of-work-dependency.md` — 단위 의존 매트릭스
- [x] `application-design/unit-of-work-story-map.md` — 스토리↔단위 매핑
- [x] 단위 경계·의존 검증, 모든 스토리 배정 확인 (24/24 커버)

---

## 결정이 필요한 질문

### Q-U1. 단위 분해(개수/경계)
설계에서 제안된 5단위(U1 수집 / U2 데이터 / U3 탐색·필터 / U4 상세·AI / U5 개인화·PWA)를 그대로 쓸까요?

A) **5단위 그대로** (Epic 정렬, 명확한 경계) — *추천*

B) **4단위로 축소** — U4(상세·AI)를 U3(UI)에 통합

C) **6단위로 확장** — U5에서 PWA/설치와 Push/알림을 분리

D) Other (please describe after [Answer]: tag below)

[Answer]: 

---

### Q-U2. 개발 순서/병행 전략
개인 개발 흐름상 단위를 어떤 순서로 진행할까요? (모노 구조, 단일 개발자 가정)

A) **U2(데이터) 먼저 → U1(수집)·U3·U4·U5 순차** — 가장 단순, 한 번에 하나씩 — *추천*

B) **U2 먼저 → 이후 목업 기반으로 UI(U3~U5)와 수집(U1)을 병행** — 빠르지만 컨텍스트 전환 많음

C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

### Q-U3. 디렉터리/코드 조직 (greenfield)
모노 구조 내부 디렉터리를 어떻게 잡을까요?

A) **기능(도메인)별 폴더** — `src/features/{notices,filters,bookmarks,...}` + `supabase/functions/collect` + `supabase/migrations` — *추천*

B) **레이어별 폴더** — `src/components`, `src/lib`, `src/app` 중심(전형적 Next.js)

C) Other (please describe after [Answer]: tag below)

[Answer]: 
