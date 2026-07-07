# U8 인증·회원별 데이터 — 도메인 엔티티 (v6, FR-13~15)

## E-U8-1 회원 (Supabase Auth 관리)
- `auth.users` — 이메일+비밀번호(해시). 앱 테이블이 `user_id uuid`로 참조.
- 앱은 비밀번호를 다루지 않음(FR-13.1). 세션은 쿠키(@supabase/ssr).

## 소유권 개편 (기존 엔티티)
| 테이블 | 현재 | v6 | 비고 |
|---|---|---|---|
| household_profile | 단일 행(id=1 CHECK) | **회원당 1행** — `user_id uuid unique` FK, CHECK 제거 | 기존 행은 user_id null 유지 → FR-15 귀속 대기 |
| recommendations | PK notice_id (전역 1세트) | **PK (user_id, notice_id)** | 기존 행 삭제 — 귀속·재계산으로 재생성 (§15 FR-15.1) |
| push_subscriptions | endpoint unique (전역) | `+ user_id uuid` FK | 기존 행은 귀속 트리거로 이전 (FR-15.2) |
| bookmarks | (localStorage) | **신설** `(user_id, notice_id)` PK, created_at | localStorage 1회 병합 (FR-14.4) |
| notices | anon 읽기 | authenticated 읽기 | 데이터 자체는 공용(회원별 아님) |

## E-U8-2 Bookmark (신설)
| 필드 | 타입 | 규칙 |
|---|---|---|
| user_id | uuid | auth.users FK, RLS 축 |
| notice_id | text | notices FK (cascade) |
| created_at | timestamptz | 기본 now() |

## 세션/인증 상태 (클라이언트)
- `AuthSession` — @supabase/ssr이 쿠키로 관리. RSC·Route Handler·브라우저 모두 동일 세션 인식.
- 로그인 화면 상태: idle / submitting / error(message) / resetSent. 가입·로그인·재설정 3모드 전환.
