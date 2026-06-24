# U3 추천 피드·프로필 UI — Infrastructure Design 계획

**고정 전제**: Next.js 14 App Router(RSC) + Tailwind, Vercel 배포. anon 조회는 기존 `src/lib/supabase/server.ts`, 프로필은 `/api/profile`(U6). 대부분 결정됨 — 질문 2개.

아래 `[Answer]:`에 보기를 적고 "완료". → infrastructure-design.md / deployment-architecture.md 생성.

### Q-IU3-1. 피드 캐싱 전략
추천 피드(`/`) 렌더 캐싱은?

A) **동적 + no-store** — 항상 최신 추천(개인앱, 트래픽 적음) — *추천*
B) revalidate(예: 60s) ISR
C) Other
[Answer]: 

### Q-IU3-2. 무한스크롤/페이지네이션 (US-3.5)
추가 로드 방식은?

A) **서버 페이지네이션(cursor) + "더 보기" 버튼** — 단순·안정 — *추천*
B) IntersectionObserver 자동 무한스크롤
C) 페이지네이션 없음(상위 N개만)
[Answer]: 

---
## 생성될 산출물
- [x] `construction/U3-feed-ui/infrastructure-design/infrastructure-design.md` — 라우트·렌더링·데이터 경로·Tailwind/PWA 연계
- [x] `construction/U3-feed-ui/infrastructure-design/deployment-architecture.md` — Vercel 배포·env·빌드
