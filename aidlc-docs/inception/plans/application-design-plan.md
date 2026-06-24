# 청약레이더 — Application Design 계획

**입력**: requirements.md, stories.md (24 stories / 5 Epics), execution-plan.md (U1~U5)

아래 **질문(Q-A1 ~ Q-A4)** 의 `[Answer]:` 태그에 보기를 적고, 완료되면 "완료"라고 알려주세요.
답변 분석 후 components.md / component-methods.md / services.md / component-dependency.md / application-design.md를 생성합니다.

---

## 생성될 산출물 (항상 생성)

- [x] `application-design/components.md` — 컴포넌트 정의·책임·인터페이스
- [x] `application-design/component-methods.md` — 메서드 시그니처(상세 로직은 Functional Design)
- [x] `application-design/services.md` — 서비스 정의·오케스트레이션
- [x] `application-design/component-dependency.md` — 의존 관계·통신 패턴·데이터 흐름
- [x] `application-design/application-design.md` — 통합 문서

---

## 결정이 필요한 질문

### Q-A1. 프로젝트 구조(레포 구성)

프론트엔드와 Supabase 코드를 어떻게 둘까요?

A) **단일 레포 모노 구조** — Next.js 앱 루트 + `supabase/`(migrations, functions) 하위 디렉터리 — _추천_

B) **프론트/백 분리** — 별도 디렉터리·설정으로 분리

C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q-A2. 수집 어댑터(Collector) 설계

4개 소스(청약홈/LH/단지/SH) 수집 컴포넌트를 어떻게 구성할까요?

A) **공통 인터페이스 + 소스별 어댑터** — `Collector` 인터페이스(fetch→normalize→Notice[])를 각 소스가 구현, 신규 소스 추가 용이 (NFR-8) — _추천_

B) **소스별 독립 함수** — 공통 추상화 없이 소스마다 개별 스크립트

C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q-A3. 프론트엔드 데이터 접근 방식

Next.js에서 Supabase 데이터를 어떻게 읽을까요?

A) **서버 컴포넌트에서 직접 Supabase 쿼리** (App Router RSC) + 필터는 서버에서 적용 — _추천_

B) **클라이언트에서 Supabase JS로 직접 쿼리** (CSR)

C) **Next.js Route Handler(API) 경유** — 클라이언트는 자체 API 호출

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q-A4. Claude 자격요약 호출 위치 (키 보호 NFR-3)

Claude API 호출을 어디서 수행할까요?

A) **수집 단계(Edge Function)에서 미리 요약 생성 → notices에 저장** — 사용자 응답 빠름, 호출 1회/공고 — _추천_

B) **상세 화면 첫 조회 시 서버(Route Handler)에서 온디맨드 호출 + 캐시 저장** — 필요한 공고만 요약

C) Other (please describe after [Answer]: tag below)

[Answer]: A
