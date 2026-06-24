# U2 데이터 플랫폼 — Functional Design 계획

**입력**: unit-of-work.md(U2), unit-of-work-story-map.md(US-2.1~2.3), components.md(C5/C8, Notice/NoticeFilter)

아래 **질문(Q-F1 ~ Q-F4)** 의 `[Answer]:` 태그에 보기를 적고, 완료되면 "완료"라고 알려주세요.
답변 분석 후 domain-entities.md / business-rules.md / business-logic-model.md를 생성합니다.
> U2는 데이터/백엔드 단위로 UI 없음 → frontend-components.md는 생성하지 않음.

---

## 생성될 산출물
- [x] `construction/U2-data-platform/functional-design/domain-entities.md` — Notice·PushSubscription 엔티티·필드·제약
- [x] `construction/U2-data-platform/functional-design/business-rules.md` — upsert/조회/필터/RLS 규칙
- [x] `construction/U2-data-platform/functional-design/business-logic-model.md` — Upserter·Repository 로직 흐름

---

## 결정이 필요한 질문

### Q-F1. notices 기본키(PK) — 공고번호 충돌 대비
SPEC은 `id TEXT PRIMARY KEY`(공고번호)입니다. 그런데 서로 다른 소스(청약홈·LH·SH) 간 공고번호가 겹칠 수 있습니다. 어떻게 할까요?

A) **합성 키 `id = "{source}:{공고번호}"`** (단일 PK 유지, 충돌 원천 차단) — *추천*

B) **복합 PK `(source, notice_no)`** — 컬럼 분리, 정석적

C) **원본 공고번호 그대로 단일 PK** — 충돌 없다고 가정(위험)

D) Other (please describe after [Answer]: tag below)

[Answer]: 

---

### Q-F2. 재수집 시 upsert 충돌 정책 — AI 요약 보존
같은 공고가 다시 수집될 때, 비용이 드는 `eligibility_summary`(Claude 요약)를 어떻게 처리할까요?

A) **요약은 보존, 나머지 필드는 갱신** — 기존 요약 있으면 재호출 안 함(비용 절감) — *추천*

B) **매번 전체 덮어쓰기** — 항상 최신(요약도 재생성, 비용↑)

C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

### Q-F3. 목록 페이지네이션 방식
목록 조회(US-3.5)의 페이지네이션을 어떻게 할까요?

A) **커서 기반**(정렬키: 마감일/등록일 + id) — 무한스크롤에 적합, 중복/누락 적음 — *추천*

B) **오프셋 기반**(limit/offset) — 단순하지만 데이터 변동 시 흔들림

C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

### Q-F4. 기본 정렬 순서 (목록)
필터 적용 후 기본 정렬을 무엇으로 할까요?

A) **신규 우선 → 마감 임박** (오늘 등록 NEW를 상단, 그다음 마감일 오름차순) — *추천*

B) **마감 임박 순** (apply_end 오름차순 단일)

C) **등록 최신순** (created_at 내림차순)

D) Other (please describe after [Answer]: tag below)

[Answer]: 
