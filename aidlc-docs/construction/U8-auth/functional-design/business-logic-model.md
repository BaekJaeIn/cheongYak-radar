# U8 인증·회원별 데이터 — 비즈니스 로직 모델 (v6)

## 인증 흐름

```text
+-----------+  미로그인   +----------------+  가입/로그인   +--------------------+
| 모든 경로  | ---------> | /login (C38)   | ------------> | Supabase Auth      |
| (미들웨어  |            | 로그인/가입/    |    세션 쿠키   | (이메일+비밀번호)   |
|  C37 가드) | <--------- | 재설정 3모드    | <------------ | @supabase/ssr      |
+-----------+  세션 있음  +----------------+               +--------------------+
      |
      v (로그인 후 기존 화면 그대로 — 단, 데이터는 본인 것만)
```

## 컴포넌트

### C37 AuthGuard (`middleware.ts`, 신규)
- @supabase/ssr `createServerClient`로 세션 확인. 미로그인 → `/login` 리다이렉트 (BR-U8-1).
- 통과 경로: `/login`, `/manifest.json`, `/sw.js`, 아이콘·정적 자산, `/_next/*`. API 라우트는 자체 401 (BR-U8-11).

### C38 LoginPage (`/login`, 클라이언트, 신규)
- 3모드: 로그인(signInWithPassword) / 가입(signUp) / 비밀번호 재설정(resetPasswordForEmail).
- 가입 성공 → 즉시 로그인 상태 → `/`로 이동 (D-9 확인 메일 끔). 오류는 한국어 메시지로 변환.
- testid: `login-email`, `login-password`, `login-submit`, `login-mode-signup`, `login-reset`.

### C39 Supabase 클라이언트 교체 (`src/lib/supabase/*`)
- browser.ts → `createBrowserClient`(@supabase/ssr), server.ts → `createServerClient`(cookies) — RSC·Route Handler가 세션 인식. admin.ts(서비스 롤) 유지.
- `getSessionUser()` 헬퍼: Route Handler/RSC에서 user 반환(없으면 null).

### C40 BookmarkRepository (DB 전환, `src/features/bookmarks/`)
- list/toggle을 bookmarks 테이블 CRUD로(브라우저 세션 클라이언트, RLS 본인만) (BR-U8-8).
- `mergeLocalOnce()`: localStorage 목록 존재 시 upsert 병합 → 로컬 키 삭제. bookmarks 페이지 로드 시 1회 실행.

### 개정 — API 라우트 (BR-U8-11)
- `/api/profile`: `getSessionUser()` 401 가드 → `upsert_household_profile(p, p_user_id)` / 조회 user_id 스코프. recompute 트리거는 DB(0011 개정)가 user_id 포함 호출.
- `/api/subscribe`: 세션 user → `push_subscriptions` upsert에 user_id 포함 (BR-U8-7).
- `/api/analyze`: 세션 user → Edge `{ action:"analyze", userId }` (BR-U8-9).

### 개정 — Edge collect
- `recommend/service.ts`: `recompute(client, userId?)` — userId 있으면 해당 회원만, 없으면 프로필 보유 회원 전원 루프. `evaluate`는 그대로, upsert/prune RPC에 user_id 전달. 반환 newIds → **회원별 맵**.
- `push.ts`: `dispatch(client, newIdsByUser)` — 회원별 구독만 조회·발송 (BR-U8-7). test-push 전체 유지.
- `analyze.ts`: `analyzePdf(client, pdf, mime, userId)` — 해당 회원 프로필 조회 (BR-U8-9).
- `index.ts`: recompute/analyze action에서 body의 userId 전달.

### 개정 — 화면
- settings에 로그아웃 버튼(+ 로그인 이메일 표시). 피드·상세·분석은 세션 클라이언트로 자동 회원 스코프(코드 변경 최소 — RLS가 필터).
- bookmarks 페이지: BookmarkStore(localStorage) → C40 저장소.

## 테스트 대상 (순수 로직)
- 북마크 병합 규칙(로컬 목록 → upsert 셋), 로그인 폼 상태 전이·오류 매핑, recompute 회원 루프의 격리(회원 1 실패 시 회원 2 계속), 푸시 회원별 라우팅 매핑.
