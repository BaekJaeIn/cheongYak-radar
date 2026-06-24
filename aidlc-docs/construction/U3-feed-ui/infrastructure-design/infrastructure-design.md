# U3 추천 피드·프로필 UI — Infrastructure Design

> 결정: 동적+no-store(Q-IU3-1=A), 서버 cursor + "더 보기"(Q-IU3-2=A). Next.js 14 App Router + Tailwind, Vercel.

## 1. 라우트 / 렌더링
| 라우트 | 타입 | 렌더 |
|---|---|---|
| `/` (app/page.tsx) | RSC | 동적 `export const dynamic = "force-dynamic"` + fetch no-store → 항상 최신 추천 |
| `/settings` (app/settings/page.tsx) | RSC shell + client ProfileForm | 동적 |
| `/api/profile` | Route Handler (U6, 기존) | nodejs runtime |
- RootLayout(app/layout.tsx): html/body, Tailwind globals, 헤더/하단 네비(피드/설정), PWA meta(매니페스트 링크는 U5에서 연결).

## 2. 데이터 경로
- **피드(읽기)**: RSC → `getRecommendationFeed(filter)` → anon Supabase(server.ts) → `recommendations`(score desc) ⨝ `notices`. RLS anon select(0001 notices, 0005 recommendations). 키 노출 없음.
- **추가 로드(US-3.5)**: cursor 기반. 서버 액션 또는 `/`?cursor= 쿼리로 다음 페이지. "더 보기" 클릭 시 append.
- **프로필**: client ProfileForm → `/api/profile`(GET/PUT, service_role 서버). 클라는 API만.

## 3. 신규 모듈(코드 생성 대상)
- `src/features/recommendations/repository.ts` — `getRecommendationFeed(filter, page)`: recommendations+notices 조회, kind/hideExpired 필터, cursor.
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/settings/page.tsx`
- `src/features/feed/*` (RecommendationFeed/Card, EligibilityBadge, MatchReason, badges, DdayBadge, FeedFilterBar)
- `src/features/profile/ProfileForm.tsx` (client)
- `src/app/globals.css` (Tailwind) + `tailwind.config.ts`, `postcss.config.js`

## 4. Tailwind 셋업
- `tailwind.config.ts`(content: src/**), `postcss.config.js`, `globals.css`(@tailwind base/components/utilities). package.json에 tailwindcss/postcss/autoprefixer devDeps 추가.

## 5. 캐싱/성능
- 피드 no-store(개인앱·저트래픽, 최신성 우선). 카드 경량, 모바일 우선.
- 추가 페이지는 limit(예 20) + cursor(score,notice_id) — U2 query-builder cursor 패턴 준용.

## 6. 보안
- anon 키만 클라/RSC 노출(RLS 보호). service_role은 /api/profile 서버 핸들러에만(U6). 프로필 민감정보 클라 직접 접근 없음.

## N/A
- 별도 서버/컨테이너·큐·LB 불필요(Vercel 서버리스 + Supabase).
