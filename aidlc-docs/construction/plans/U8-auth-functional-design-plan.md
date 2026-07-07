# U8 인증·회원별 데이터 — Functional + Infrastructure Design Plan (v6)

**변경요청**: v6 (회원가입/로그인·회원별 데이터) — requirements.md §15 FR-13~15
**단위**: U8 (신규: 인증) + U2/U5/U6/U3/U4/U7 개정. Functional·Infrastructure 설계를 통합 산출(v2 consolidated 선례).

**질문 없음**: 핵심 결정은 요구사항 Q1~Q5로 확정. 잔여 1건(이메일 확인 on/off)은 아래 D-9로 기본값 결정 — 승인 게이트에서 고지.

## 설계 결정
- **D-1 인증 스택**: Supabase Auth(이메일+비밀번호) + `@supabase/ssr`(쿠키 세션). Next `middleware.ts`로 전체 잠금(FR-13.3) — 예외: `/login`, PWA 자산(manifest·sw.js·아이콘), API는 각자 401 처리.
- **D-2 스키마**: user_id(uuid, auth.users FK) 축으로 개편 — household_profile(회원당 1행, unique user_id), recommendations(PK user_id+notice_id, 기존 행은 재계산 대상이므로 삭제 후 재생성), push_subscriptions(+user_id), bookmarks 신설. RPC(upsert_household_profile/upsert_recommendations/prune)에 user_id 파라미터 추가.
- **D-3 RLS**: anon 전면 차단 → authenticated 본인 행만(`user_id = auth.uid()`). notices·criteria성 데이터는 authenticated 읽기. **전환 순서 보호**: anon 읽기 정책 제거는 코드 배포 후 후속 마이그레이션(0013)으로 분리 — 배포 사이 구버전 앱이 깨지지 않게.
- **D-4 귀속(FR-15)**: `auth.users` AFTER INSERT 트리거 — 신규 회원 이메일이 `jiback96@naver.com`이면 user_id가 비어 있는 household_profile·push_subscriptions 행을 그 회원으로 UPDATE. 앱 코드 경로와 무관하게 동작.
- **D-5 회원별 재계산**: Edge recompute를 "프로필 보유 회원 루프"로 확장. 프로필 변경 트리거(0011)는 변경 행의 user_id를 body에 실어 해당 회원만 재계산. 수집(cron)은 전 회원 재계산.
- **D-6 회원별 푸시**: 신규 추천이 생긴 회원의 구독(user_id 매칭)에만 발송. test-push는 전체 유지.
- **D-7 북마크 DB화(FR-14.4)**: bookmarks CRUD는 브라우저 세션 클라이언트(RLS 본인만). 첫 진입 시 localStorage 잔존 북마크를 1회 병합 후 로컬 삭제.
- **D-8 API 세션화**: /api/profile·/api/subscribe·/api/analyze가 세션에서 user 확인(401) 후 user_id 스코프로 동작. analyze는 Edge에 userId 전달 → 해당 회원 프로필로 판정(FR-14.5).
- **D-9 이메일 확인**: **끔(즉시 가입)** 기본 — 개인용 단순화, 재설정 메일은 유지. Supabase 대시보드 설정 1회 필요. (원하면 켜기로 변경 가능 — 게이트에서 확인)

## Steps
- [x] Step 1: domain-entities.md — 회원·소유권 모델, 테이블 개편 요약
- [x] Step 2: business-rules.md — BR-U8-1~12
- [x] Step 3: business-logic-model.md — 컴포넌트(미들웨어·로그인·저장소·Edge 개정)와 흐름
- [x] Step 4: infrastructure-design.md — 마이그레이션 0012/0013 상세, RLS 매트릭스, RPC·트리거, 대시보드 설정, 롤아웃 순서
