# Build Instructions — 청약레이더

## Prerequisites
- **런타임**: Node.js ≥ 18 (개발 검증은 Node 23), npm 10
- **프론트/백**: Next.js 14.2.5, TypeScript 5, Tailwind 3, @supabase/supabase-js 2
- **Edge Function**: Deno (Supabase Edge runtime) — `supabase/functions/collect`
- **DB/배포**: Supabase(PostgreSQL + Edge Functions), Vercel
- **CLI(선택)**: Supabase CLI(로컬 DB/마이그레이션), web-push(VAPID 키 생성)

## 환경 변수 (.env.example 참고)
- 공개: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- 서버 전용: `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `VAPID_PRIVATE_KEY`, `DATA_GO_KR_API_KEY`, `COLLECT_MODE`(mock|live)

## Build Steps
### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 구성(로컬)
```bash
cp .env.example .env.local   # 값 채우기 (없으면 placeholder로 빌드만 가능)
npx web-push generate-vapid-keys   # VAPID 키 생성 → env 등록
```

### 3. 빌드
```bash
npm run build      # next build (Tailwind 포함)
```

### 4. DB 마이그레이션(로컬)
```bash
supabase start
supabase db reset  # 0001~0005 + seed 적용
```

### 5. Edge Function(수집·추천·푸시)
```bash
supabase functions serve collect      # 로컬
# 또는 배포: supabase functions deploy collect
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... GEMINI_API_KEY=... VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... COLLECT_MODE=mock
```

## Verify Build Success
- **기대 출력**: `✓ Compiled successfully` + 라우트 표(`/`, `/bookmarks`, `/notice/[id]`, `/settings`, `/api/profile`, `/api/subscribe`)
- **검증 결과(2026-06-25)**: 컴파일 성공, 7개 라우트.

## Troubleshooting
- **빌드 시 Supabase 환경변수 오류**: 빌드는 force-dynamic이라 런타임에 조회 → placeholder env로도 빌드 통과. 실데이터는 실제 키 필요.
- **아이콘 404(설치 시)**: `public/icon-192.png`,`icon-512.png` 추가 필요(빌드는 통과).
- **Edge web-push 임포트 실패**: Deno 네트워크 허용 확인(`npm:web-push@3.6.7`).
