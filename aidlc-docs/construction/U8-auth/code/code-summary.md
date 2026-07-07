# U8 인증·회원별 데이터 — 코드 요약 (v6)

**근거**: requirements.md §15 FR-13~15, U8 functional-design(BR-U8-1~12, C37~C40), infrastructure-design.md
**플랜**: `aidlc-docs/construction/plans/U8-auth-code-generation-plan.md` (12단계 완료)

## 1. 생성/수정 파일

### DB 마이그레이션
| 파일 | 내용 |
|---|---|
| `supabase/migrations/0012_multi_user.sql` | (additive) household_profile user_id 축 전환(unique FK·RLS·`upsert_household_profile(p, p_user_id)`), recommendations 회원화(행 삭제 후 PK(user_id, notice_id)·`upsert_recommendations`/`prune_recommendations` p_user_id 시그니처), push_subscriptions +user_id, **bookmarks 신설**(RLS own select/insert/delete), notices authenticated 읽기 추가, **jiback96@naver.com 가입 시 레거시 데이터 귀속 트리거**(BR-U8-10), 프로필 변경 트리거가 `{action:"recompute", userId}` 전송 |
| `supabase/migrations/0013_lock_anon.sql` | anon 정책 제거(notices·recommendations 읽기, push insert) — **롤아웃 3단계에서 별도 적용** (BR-U8-12) |

### 인증 기반 (C37~C39)
| 파일 | 내용 |
|---|---|
| `src/lib/supabase/browser.ts` | `createBrowserClient`(@supabase/ssr) 쿠키 세션, 싱글턴 |
| `src/lib/supabase/server.ts` | `createServerClient` + `cookies()` getAll/setAll (RSC 쓰기 불가는 try/catch — 미들웨어가 갱신) |
| `src/lib/supabase/session.ts` | `getSessionUser()` — 서버측 세션 사용자 조회 |
| `middleware.ts` | 전체 잠금: 미로그인 → `/login` 리다이렉트. 예외: `/login`·`/api`(자체 401)·정적/PWA 자산(sw.js, manifest 등 확장자 파일)·`_next` (BR-U8-1) |
| `src/app/login/page.tsx` + `src/features/auth/LoginForm.tsx` | 로그인/가입/비밀번호 재설정 3모드, 성공 시 `/` 이동 (C38) |
| `src/features/auth/errors.ts` | Supabase Auth 오류 → 한국어 매핑 (순수) |
| `src/features/auth/LogoutButton.tsx` + `src/app/settings/page.tsx` | 로그인 계정 표시 + 로그아웃(→ /login) (FR-13.4) |
| `src/features/nav/BottomNav.tsx` | `/login`에서 하단 탭 숨김 |

### 회원 스코프 데이터 (BR-U8-5·11)
| 파일 | 내용 |
|---|---|
| `src/app/api/profile/route.ts` | GET/PUT 세션 401 가드, `getProfile/saveProfile(user.id, …)`, 재계산 트리거에 userId 전달 |
| `src/features/profile/repository.ts` | user_id 스코프 조회 + `upsert_household_profile(p, p_user_id)` RPC |
| `src/app/api/subscribe/route.ts` | 세션 401 가드, 구독 행에 `user_id` 귀속 |
| `src/app/api/analyze/route.ts` | 세션 401 가드, Edge 호출 body에 `userId` |
| `src/app/page.tsx` | 피드 관심지역: 세션 사용자 프로필 기준 |

### 북마크 DB화 (C40, BR-U8-8)
| 파일 | 내용 |
|---|---|
| `src/features/bookmarks/repository.ts` | `listBookmarkIds`/`isBookmarked`/`toggleBookmark`/`mergeLocalOnce` + 순수 `planMergeRows`(존재 공고만 — FK 위반 방지). 병합은 DO NOTHING upsert, **성공 시에만** localStorage 비움 |
| `src/features/bookmarks/store.ts` | 레거시 병합 소스 + 순수 유틸(parseList/toggleInList)로 축소, `clear()` 추가 |
| `src/features/bookmarks/BookmarkButton.tsx` | DB 비동기 토글(busy 가드) |
| `src/app/bookmarks/page.tsx` | `mergeLocalOnce → listBookmarkIds → notices .in` |

### Edge 회원화 (D-5·D-6, BR-U8-6·7·9)
| 파일 | 내용 |
|---|---|
| `supabase/functions/collect/recommend/service.ts` | `recompute(client, userId?)` — 프로필 보유 회원 루프(회원 간 실패 격리), 회원별 `newIdsByUser`, RPC에 p_user_id |
| `supabase/functions/collect/push.ts` | `dispatch(client, newIdsByUser)` — 회원별 구독 기기에만 발송, 회원당 상한 5건, 만료 구독 정리 유지 |
| `supabase/functions/collect/analyze.ts` | `analyzePdf(…, userId)` — 요청 회원 프로필로 판정, 미로그인 거부 |
| `supabase/functions/collect/index.ts` | body `{action, userId, pdfBase64…}` 라우팅, `runRecomputeOnly(userId?)` |

## 2. 테스트 (신규 14개 — 전체 162개 통과)
| 파일 | 대상 |
|---|---|
| `src/features/auth/__tests__/errors.test.ts` | 한국어 오류 매핑 7케이스 |
| `src/features/bookmarks/__tests__/merge.test.ts` | `planMergeRows` — FK 필터·중복 제거·빈 입력 |
| `src/features/profile/__tests__/repository.test.ts` | 프로필 조회/저장의 user_id·p_user_id 스코프 (mock client 회귀 가드) |
| `supabase/functions/collect/recommend/__tests__/service.test.ts` | `collectNewIds` — was_inserted 추출 |

참고: `push.ts`는 `npm:web-push` Deno 전용 import라 vitest에서 직접 import 불가 — 회원 라우팅의 순수 부분(collectNewIds)만 검증.

## 3. 보안 유지 사항
- 비밀번호는 Supabase Auth가 해시 저장 — 코드·문서 어디에도 평문 없음
- service_role·GEMINI·VAPID 키는 서버 전용(NFR-3), 클라이언트는 anon key + RLS
- 가구 프로필(소득·자산)은 LLM에 전송하지 않음 (BR-U7-3 유지)
- 개방 가입에 따른 Gemini 쿼터 리스크는 C-13으로 수용됨 (Q2=B)

## 4. Supabase 대시보드 설정 (수동)
- [ ] Authentication → Sign In / Up → **Confirm email 끔** (개인용 — 메일 확인 생략)
- [ ] Authentication → URL Configuration → **Site URL** = Vercel 프로덕션 URL (비밀번호 재설정 링크용)

## 5. 롤아웃 체크리스트 (infrastructure-design §6 — 코드 승인 후)
1. [ ] `supabase db push` — 0012 적용 (additive, 기존 anon 동작 유지)
2. [ ] git push(Vercel 배포) + `supabase functions deploy collect`
3. [ ] 로그인·프로필·추천 동작 확인 후 0013 적용(anon 차단)
4. [ ] jiback96@naver.com 가입 → 레거시 프로필·푸시 구독 귀속 확인
5. [ ] 대시보드 설정(§4) 확인

**주의**: 0012의 recommendations 개편은 기존 추천 행을 삭제함 — 첫 재계산(프로필 귀속 후 자동/수동)까지 추천 피드가 비어 보일 수 있음. 가입(4단계) 후 프로필 저장 한 번이면 재계산 트리거로 복원됨.
