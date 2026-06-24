# U4 공고 상세 — Deployment Architecture

> U3와 동일(Vercel Next.js + Supabase). 변경점은 신규 동적 라우트뿐.

## 구성
```
[Vercel] Next.js
   └ RSC `/notice/[id]` (동적 no-store)
        └ anon Supabase: notices.getById + recommendations 단건 (RLS read)
```

## 환경변수
- 기존 그대로(NEXT_PUBLIC_SUPABASE_URL/ANON_KEY). 신규 없음. service_role 불필요(읽기 전용).

## 빌드/검증 (Build & Test)
- `npm run typecheck`, `npm test`(timeline/criteria-text 순수 테스트), `npm run build`(라우트 컴파일).
- 로컬: 피드 카드 → `/notice/[id]` 진입 확인. 잘못된 id → 404.

## 연계
- 피드(U3) 카드 링크 → 상세. 북마크(U5)·PWA(U5)는 후속.
