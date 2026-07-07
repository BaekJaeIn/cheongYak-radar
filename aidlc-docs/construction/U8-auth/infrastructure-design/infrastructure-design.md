# U8 인증·회원별 데이터 — 인프라 설계 (v6)

## 1. 마이그레이션 0012 (additive — 구버전 앱과 공존 가능)
1) **household_profile 회원화**
   - `check (id = 1)` 제거, id는 시퀀스 기반으로 전환(다행 허용).
   - `user_id uuid unique references auth.users(id) on delete cascade` 추가 (기존 행은 null 유지 → 귀속 대기).
   - RLS: authenticated 본인 행 select/insert/update (`user_id = auth.uid()`).
   - RPC `upsert_household_profile(p jsonb, p_user_id uuid)` — on conflict (user_id) update. 구 시그니처는 제거(코드와 동시 배포).
2) **recommendations 회원화**
   - 기존 행 DELETE(재계산으로 재생성) → `user_id uuid not null` 추가, PK `(user_id, notice_id)`.
   - RLS: authenticated 본인 행 select. `upsert_recommendations(p, p_user_id)`·prune도 user_id 스코프.
3) **push_subscriptions**: `user_id uuid references auth.users` 추가(null 허용 — 귀속 대기). unique(endpoint) 유지.
4) **bookmarks 신설**: `(user_id, notice_id)` PK, notices FK cascade, created_at. RLS: authenticated 본인 행 select/insert/delete.
5) **귀속 트리거 (FR-15, BR-U8-10)**: `auth.users` AFTER INSERT — `new.email = 'jiback96@naver.com'`이면 household_profile·push_subscriptions의 user_id null 행을 new.id로 UPDATE, 이어서 recompute 호출(0011 함수 재사용). security definer.
6) **0011 개정**: 프로필 변경 트리거가 `{ action:"recompute", userId: NEW.user_id }`로 호출.

## 2. 마이그레이션 0013 (코드 배포 후 — BR-U8-12)
- notices `notices_anon_read` → `notices_auth_read`(to authenticated), recommendations·기타 anon 정책 제거.

## 3. RLS 매트릭스 (전환 완료 시점)
| 테이블 | anon | authenticated | service_role |
|---|---|---|---|
| notices | ✗ | 읽기 | 전체(수집) |
| household_profile | ✗ | 본인 행 CRUD | 전체(Edge·귀속) |
| recommendations | ✗ | 본인 행 읽기 | 전체(재계산) |
| bookmarks | ✗ | 본인 행 CRUD | — |
| push_subscriptions | ✗ | ✗ (API 경유) | 전체(발송·저장) |

## 4. 앱 구성
- 의존성 추가: `@supabase/ssr`.
- 신규: `middleware.ts`(루트), `src/app/login/page.tsx` + `src/features/auth/`(LoginForm·auth 헬퍼).
- 교체: `src/lib/supabase/browser.ts`·`server.ts`(ssr 기반), API 3종 세션 가드, bookmarks 저장소 DB화.
- Edge: service.ts(회원 루프)·push.ts(회원별)·analyze.ts(userId)·index.ts(전달) 개정 → `supabase functions deploy collect`.

## 5. Supabase 대시보드 설정 (1회 수동)
- Auth → Email provider 활성(기본) 확인, **Confirm email 끔** (D-9), Site URL = 배포 도메인(재설정 메일 리다이렉트용).

## 6. 롤아웃 순서
1. 마이그레이션 0012 적용 (구버전 앱 계속 동작 — anon 정책 아직 유지)
2. 코드 배포(Vercel) + Edge 재배포
3. 동작 확인(로그인·가입) → 마이그레이션 0013 적용(anon 차단)
4. **jiback96@naver.com 가입** → 귀속 트리거 동작 확인(프로필 표시·추천 재계산)
5. 상대방 계정 가입 → 각자 프로필 입력

## 7. 리스크
- PWA 자산이 미들웨어에 걸리면 설치·푸시 파손 → 예외 경로 테스트 필수 (BR-U8-1).
- 구 RPC 시그니처 제거는 코드와 동시 배포(불일치 시 저장 실패) — 롤아웃 순서 준수.
- C-13(공개 가입) 수용 — 후속 개선 후보: 회원별 분석 횟수 제한.
