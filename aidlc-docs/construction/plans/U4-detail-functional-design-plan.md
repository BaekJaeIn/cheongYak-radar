# U4 공고 상세·자격판정·AI요약 — Functional Design 계획

**입력**: stories E4(US-4.1~4.4) + US-6.3 표시, components C17~C20/C31~C32, U2 NoticeRepository.getById, U6 recommendations·notice.eligibility·eligibility_summary.
**화면**: `/notice/[id]` (RSC).

아래 `[Answer]:`에 보기를 적고 "완료". → frontend-components.md / business-rules.md / business-logic-model.md 생성.

### Q-FU4-1. 자격판정 상세 소스
상세 화면의 자격 판정/사유를 무엇으로 표시할까요?

A) **저장된 recommendation + notice.eligibility 기반** — score·eligibleTypes·reasonSummary + 공고 자격조건 표시(추가 계산 없음) — *추천*
B) 상세 진입 시 온디맨드 재계산(matcher 재실행)
C) Other
[Answer]: 

### Q-FU4-2. AI 자격요약 (US-4.3)
자격조건 AI 요약은?

A) **수집 단계서 저장된 `eligibility_summary` 표시(없으면 숨김/원문 링크)** — 빠름, 비용 0 — *추천*
B) 상세 첫 진입 시 온디맨드 Claude 생성+저장
C) Other
[Answer]: 

### Q-FU4-3. 미보유 데이터 처리 (US-4.1 면적별 세대수 등)
공급 데이터가 부족할 때(세대수 등 API 미수집)?

A) **있는 정보만 표시(면적 범위·일정·자격·요약·원문)** — 없는 섹션은 생략 — *추천*
B) "정보 없음" placeholder 노출
C) Other
[Answer]: 

---
## 생성될 산출물
- [x] `construction/U4-detail/functional-design/frontend-components.md`
- [x] `construction/U4-detail/functional-design/business-rules.md`
- [x] `construction/U4-detail/functional-design/business-logic-model.md`
