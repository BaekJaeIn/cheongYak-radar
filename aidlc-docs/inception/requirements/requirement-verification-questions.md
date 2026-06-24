# 청약레이더 — Requirements 명확화 질문

SPEC.md를 기반으로 요구사항을 확정하기 위한 질문입니다.
각 질문의 `[Answer]:` 태그 뒤에 보기 알파벳(A, B, C ...)을 적어주세요.
해당하는 보기가 없으면 마지막 보기(Other)를 선택하고 `[Answer]:` 뒤에 직접 설명을 적어주세요.
다 작성하시면 "완료" 또는 "done"이라고 알려주세요.

---

## Question 1

이번 1차 개발의 범위(MVP)는 어디까지로 할까요? (SPEC §9 7볼트 기준)

A) 볼트 1~3만 (프로젝트 셋업 + 공공 API 자동수집 + DB 스키마) — 데이터 파이프라인 우선

B) 볼트 1~6 (셋업 + 수집 + DB + 목록 UI + 상세 UI + 북마크) — SH 크롤링 제외한 전체

C) 볼트 1~7 전체 (SH 크롤링 포함)

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 2

data.go.kr 공공데이터 API 키를 이미 발급받으셨나요? (청약홈/마이홈포털 연동에 필요)

A) 이미 발급받았고 바로 사용 가능

B) 아직 — 발급 절차 안내가 필요함 (실제 연동은 키 준비 후 진행, 그 전까지 목업 데이터로 개발)

C) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 3

사용자 인증(Auth)과 설정/북마크 저장 방식을 어떻게 할까요? (SPEC §2, §6-3)

A) 인증 없음 — 필터 설정과 북마크 모두 localStorage(브라우저)에만 저장 (가장 단순)

B) 인증 없음 + device_id 기반 — 북마크를 Supabase에 device_id로 저장(기기 단위), 설정은 localStorage

C) Supabase Auth 도입 — 로그인 후 기기 간 동기화

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 4

공고 자동수집 cron 실행 주체는 무엇으로 할까요? (SPEC §8, §10)

A) Supabase Edge Function의 cron (pg_cron / scheduled functions) — SPEC 기본안

B) Vercel Cron Jobs

C) GitHub Actions 스케줄러

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 5

공고 상세 화면의 "자격조건 요약"(SPEC §6-2, §10)에 Claude API를 이번 범위에 포함할까요?

A) 포함 — 자격조건 원문을 Claude API로 요약 (claude-opus-4-8 등 최신 모델)

B) 제외 — 이번엔 원문 표시만, AI 요약은 향후 확장으로 보류

C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 6

Web Push 신규공고 알림(SPEC §10)을 이번 범위에 포함할까요?

A) 포함 — PWA Web Push 알림 구현

B) 제외 — 향후 확장으로 보류 (이번엔 PWA 설치/오프라인 캐시까지만)

C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 7

대상 사용자 규모/공개 범위는 어떻게 가정할까요? (성능·보안 요구사항 판단용)

A) 개인용 — 나(및 가족 몇 명)만 사용하는 비공개 도구

B) 소규모 공개 — 지인/커뮤니티 수십~수백 명 수준

C) 일반 공개 서비스 — 불특정 다수 대상

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 8

SPEC.md와 실제 요구사항 사이에 우선적으로 반영했으면 하는 추가/변경 사항이 있나요?

A) 없음 — SPEC.md 내용 그대로 진행

B) 있음 (아래에 설명)

[Answer]: A

---

# 확장(Extensions) 적용 여부

## Question: Security Extensions

이 프로젝트에 보안(Security) 확장 규칙을 강제할까요?

A) Yes — 모든 SECURITY 규칙을 차단 제약(blocking)으로 강제 (운영급 애플리케이션 권장)

B) No — SECURITY 규칙 생략 (PoC·프로토타입·실험용 프로젝트에 적합)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question: Resiliency Extensions

이 프로젝트에 회복성(Resiliency) 베이스라인을 적용할까요?

**이 확장의 정의.** 활성화하면 AWS Well-Architected Framework(신뢰성 기둥) 기반의 **설계 시점 모범사례**(내결함성·고가용성·관측성·복구성 등 15개 실천영역)를 요구사항·설계·코드에 반영하도록 유도합니다.

**아닌 것.** 이 확장이 곧 운영준비(production-ready)나 가용성·RTO·RPO 보장을 의미하지는 않습니다. 좋은 회복성 결정을 초기에 잡아주는 **출발점**입니다.

A) Yes — 회복성 베이스라인을 설계 지침으로 적용 (비즈니스 크리티컬 워크로드 권장)

B) No — 회복성 베이스라인 생략 (빠른 반복이 중요한 PoC·프로토타입에 적합)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question: Property-Based Testing Extension

이 프로젝트에 속성 기반 테스트(PBT) 규칙을 강제할까요?

A) Yes — 모든 PBT 규칙을 차단 제약으로 강제 (비즈니스 로직·데이터 변환·직렬화·상태 컴포넌트가 있는 프로젝트 권장)

B) Partial — 순수 함수와 직렬화 왕복(round-trip)에만 PBT 적용 (알고리즘 복잡도가 제한적인 프로젝트에 적합)

C) No — PBT 규칙 생략 (단순 CRUD·UI 위주·얇은 통합 계층 프로젝트에 적합)

X) Other (please describe after [Answer]: tag below)

[Answer]: C
