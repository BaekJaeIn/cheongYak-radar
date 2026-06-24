# U3 추천 피드·프로필 UI — Deployment Architecture

## 1. 배포 구성
```
[Vercel] Next.js 14 (App Router)
   ├ RSC `/`, `/settings` (동적, no-store)
   │     └ anon Supabase 조회 (recommendations ⨝ notices, RLS)
   └ Route Handler `/api/profile` (nodejs, service_role)
         └ household_profile (RPC) + collect recompute 트리거
[Supabase] Postgres(notices·recommendations·household_profile) + Edge(collect)
```

## 2. 환경변수 (Vercel)
| 키 | 노출 | 용도 |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY | public | RSC 피드 조회(RLS) |
| SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY | server only | /api/profile, recompute 트리거 |
- `.env.example`에 이미 정의(U2). Vercel 프로젝트 설정에 등록.

## 3. 빌드
- `npm run build`(next build). Tailwind 포함.
- 최초 app 라우트 셋업(layout/page) → 이 단계에서 `next build` 동작 가능해짐.
- 정적 자원/매니페스트(PWA)는 U5에서 추가(next-pwa 래핑).

## 4. 검증(Build & Test 단계)
- `npm run typecheck`(tsc), `npm test`(vitest), `npm run build`.
- 로컬: `npm run dev` → `/`(추천 피드, 프로필 미입력 시 안내) → `/settings` 저장 → 재계산 후 피드 확인.
- 데이터: Supabase 로컬(`supabase db reset` 0001~0005 + seed) 또는 collect 수동 호출(mock).

## 5. 연계
- U4(상세 `/notice/[id]`)·U5(PWA·Push)는 이 라우트/레이아웃 위에 확장.
- 피드 카드의 상세 링크 → U4.
