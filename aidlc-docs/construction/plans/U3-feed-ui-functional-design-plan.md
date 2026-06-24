# U3 추천 피드·프로필 UI — Functional Design 계획

**입력**: stories E3(US-3.1~3.6) + E6 UI(US-6.1 ProfileForm·US-6.5 RecommendationFeed), components C12~C16/C29~C32, U2 NoticeRepository, U6 recommendations·/api/profile.
**범위(v2)**: 목록 `/`을 **추천 피드**(점수순)로, `/settings`를 **프로필 입력**으로. 배지·D-day·자격표시. 필터는 보조.

아래 **질문(Q-FU3-1 ~ Q-FU3-4)** 의 `[Answer]:`에 보기를 적고, 완료되면 "완료".
→ business-logic-model.md / business-rules.md / **frontend-components.md** 생성.

---

## 결정이 필요한 질문

### Q-FU3-1. 추천 피드 데이터 접근

추천 피드(`/`)는 어떻게 데이터를 읽을까요?

A) **서버 컴포넌트(RSC)에서 recommendations + notices 조인 조회** — 점수순, anon RLS read — _추천_
B) 클라이언트에서 /api 호출(CSR)
C) Other
[Answer]: A

### Q-FU3-2. 프로필 입력 폼 구성 (US-6.1)

프로필(`/settings`) 입력 UI를?

A) **단일 스크롤 폼(섹션 구분)** — 혼인/소득/자산/거주/청약통장/희망조건 한 화면 — _추천_
B) 단계별 위저드(여러 스텝)
C) Other
[Answer]: A

### Q-FU3-3. 자격 상태 표현 (US-6.3 표시)

eligible/conditional/ineligible를 피드/상세에서 어떻게?

A) **3색 배지 + 텍스트("신청가능"/"확인필요"/"불가") + 사유 툴팁/펼침** (NFR-7 텍스트 병기) — _추천_
B) 가능/불가 2단계만
C) Other
[Answer]: A

### Q-FU3-4. 필터(보조) 범위 (US-3.4/3.6)

추천 중심에서 필터는 어디까지?

A) **간단 보조 필터만** — 유형(분양/임대)·마감숨김 토글, 정렬은 점수순 고정 — _추천_
B) 전체 필터(지역·면적·순위·신혼) 유지
C) 필터 없음(추천 점수순만)
[Answer]: A

---

## 생성될 산출물

- [x] `construction/U3-feed-ui/functional-design/frontend-components.md` — 컴포넌트 계층·props·상태·상호작용·data-testid
- [x] `construction/U3-feed-ui/functional-design/business-rules.md` — 피드 표시/배지/D-day/필터 규칙
- [x] `construction/U3-feed-ui/functional-design/business-logic-model.md` — 화면 데이터 흐름(RSC↔API)
