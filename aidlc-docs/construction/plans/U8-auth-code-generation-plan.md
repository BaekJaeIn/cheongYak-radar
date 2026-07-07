# U8 인증·회원별 데이터 — Code Generation Plan (v6)

**근거**: requirements.md §15 FR-13~15, U8 설계(D-1~D-9, BR-U8-1~12, infrastructure-design.md).
**이 플랜이 Code Generation의 단일 소스.** 구현 순서 = 롤아웃 안전 순서(0013은 배포 확인 후).

## 생성/수정 위치
| 대상 | 경로 | 구분 |
|---|---|---|
| 마이그레이션(additive) | `supabase/migrations/0012_multi_user.sql` | Create |
| 마이그레이션(anon 차단) | `supabase/migrations/0013_lock_anon.sql` | Create (적용은 롤아웃 3단계) |
| Supabase 클라이언트 | `src/lib/supabase/browser.ts`·`server.ts` (ssr화), `session.ts` (신규) | Modify/Create |
| 인증 가드·화면 | `middleware.ts`, `src/app/login/page.tsx`, `src/features/auth/LoginForm.tsx`·`errors.ts` | Create |
| API 세션화 | `src/app/api/{profile,subscribe,analyze}/route.ts` | Modify |
| Edge 회원화 | `supabase/functions/collect/{recommend/service.ts, push.ts, analyze.ts, index.ts}` | Modify |
| 북마크 DB화 | `src/features/bookmarks/{repository.ts(신규), store.ts(병합 유틸화), BookmarkButton.tsx}`, `src/app/bookmarks/page.tsx` | Create/Modify |
| 로그아웃 | `src/app/settings/page.tsx` + `src/features/auth/LogoutButton.tsx` | Modify/Create |
| 테스트 | auth errors·북마크 병합·푸시 회원 라우팅 등 순수 로직 | Create |
| 코드 요약 | `aidlc-docs/construction/U8-auth/code/code-summary.md` | Create (docs) |

## Steps
- [x] Step 1: **0012_multi_user.sql** — household_profile(CHECK 제거·id 시퀀스·user_id unique FK·RLS·`upsert_household_profile(p, p_user_id)`), recommendations(행 삭제·user_id·PK(user_id,notice_id)·RLS·`upsert_recommendations(p, p_user_id)`·`prune_recommendations(keep_ids, p_user_id)`), push_subscriptions(+user_id), bookmarks 신설(RLS), auth.users 귀속 트리거(jiback96@naver.com, BR-U8-10), 0011 함수 개정(userId 포함 호출)
- [x] Step 2: **0013_lock_anon.sql** — notices anon 읽기→authenticated, recommendations anon 정책 제거 (적용은 롤아웃 3단계, BR-U8-12)
- [x] Step 3: **@supabase/ssr 도입** — package.json, browser.ts(createBrowserClient)·server.ts(createServerClient+cookies)·session.ts(getSessionUser) (C39)
- [x] Step 4: **middleware.ts** — 전체 잠금, 예외(/login·PWA 자산·_next·api) (C37, BR-U8-1)
- [x] Step 5: **/login** — LoginForm 3모드(로그인/가입/재설정)+한국어 오류 매핑(errors.ts 순수)+testid, login/page.tsx (C38)
- [x] Step 6: **API 세션화** — profile(user_id 스코프 RPC)·subscribe(user_id 귀속)·analyze(Edge에 userId) 401 가드 (BR-U8-11, D-8)
- [x] Step 7: **Edge 회원화** — service.ts recompute(client, userId?) 회원 루프·회원별 newIds, push.ts dispatch(newIdsByUser)·test-push 유지, analyze.ts analyzePdf(..., userId), index.ts 전달 (D-5·D-6, BR-U8-6·7·9)
- [x] Step 8: **북마크 DB화** — repository.ts(list/toggle/mergeLocalOnce), store.ts는 병합용 순수 유틸로 축소, BookmarkButton·bookmarks/page.tsx DB 기반 (C40, BR-U8-8)
- [x] Step 9: **로그아웃** — settings에 LogoutButton + 로그인 이메일 표시 (+/login에서 BottomNav 숨김)
- [x] Step 10: **테스트** — errors 매핑, 북마크 병합 규칙(planMergeRows), collectNewIds, profile RPC 스코프 인자 (신규 14개)
- [x] Step 11: **코드 요약 문서** — code-summary.md (+대시보드 설정·롤아웃 체크리스트)
- [x] Step 12: **검증** — vitest 162/162 통과, `tsc --noEmit` 무오류, `next build` 성공(/login 라우트 포함)

## 롤아웃 (코드 승인 후 별도 진행 — infrastructure-design §6)
1. `supabase db push`(0012) → 2. git push(Vercel)+`functions deploy collect` → 3. 로그인 확인 후 0013 적용 → 4. jiback96@naver.com 가입(귀속 확인) → 5. 대시보드: Confirm email 끔·Site URL
