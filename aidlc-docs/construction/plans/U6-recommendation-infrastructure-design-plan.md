# U6 프로필·자격매칭·추천 — Infrastructure Design 계획

**입력**: U6 functional-design(domain/rules/logic), U2 infra(notices·RPC·RLS), U1 infra(collect Edge Function·pg_cron·Anthropic 시크릿). 전제: Supabase(Postgres+Edge Functions) + Next.js 14.

아래 **질문(Q-IU6-1 ~ Q-IU6-4)** 의 `[Answer]:` 태그에 보기를 적고, 완료되면 "완료"라고 알려주세요.

---

## 생성될 산출물
- [x] `construction/U6-recommendation/infrastructure-design/infrastructure-design.md` — recommendations 테이블·RLS, criteria config 배치, 재계산 실행 환경, 프로필 접근 경로, Anthropic 시크릿 재사용, Push 연계
- [x] `construction/U6-recommendation/infrastructure-design/deployment-architecture.md` — 마이그레이션(0005), 배포·트리거 체인(collect→recompute→push), 환경변수

**답변(반영 완료)**: Q-IU6-1=A · Q-IU6-2=A · Q-IU6-3=A · Q-IU6-4=A

---

## 결정이 필요한 질문

### Q-IU6-1. recommendations 테이블 접근 정책 (RLS)
추천 결과(점수·사유·eligibleTypes — 비민감)를 화면에서 어떻게 읽을까요? (프로필 원본은 별도로 service_role 전용 유지)

A) **anon 읽기 허용 + service_role 쓰기**(notices와 동일 패턴). 클라이언트가 추천 피드를 직접 조회 — 단순·빠름 — *추천*

B) **service_role 전용**(anon 차단). 화면은 Next 서버 경유로만 조회(노출 최소화)

C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q-IU6-2. 재계산(RecommendationService) 실행 위치
자격매칭·점수 재계산을 어디서 실행할까요? (Q-FU6-1=A precompute+persist)

A) **기존 collect Edge Function에 recompute 단계 추가** — 수집 직후 자동 재계산, 신규추천 newIds를 같은 자리에서 Push 트리거(U1 triggerPush 확장). 트리거 일원화 — *추천*

B) **별도 `recommend` Edge Function** — collect가 끝나면 호출(관심사 분리). 프로필 변경 시에도 단독 호출

C) **Next.js 서버(Route Handler)** — on-demand 위주 + 수집 후 호출

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q-IU6-3. 자격 기준표(criteria) 파일 형식 (Q-FU6-3=A 리포 내 연도별)
`src/config/criteria-2026.*` 의 형식을 무엇으로?

A) **TS 모듈**(`criteria-2026.ts`, 타입 안전·import 즉시) — 엔진과 같은 런타임에서 사용 — *추천*

B) **JSON**(`criteria-2026.json`, 데이터/코드 분리, 로더 필요)

C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q-IU6-4. 프로필 읽기/쓰기 경로 (민감정보, RLS anon 차단)
`household_profile`은 service_role만 접근 가능(0004). ProfileForm 저장/조회를 어떤 경로로?

A) **Next.js Route Handler / Server Action + service_role** — 서버에서만 프로필 접근, 클라는 API 호출 — *추천*

B) **별도 `profile` Edge Function** — 프로필 CRUD 전용 함수

C) Other (please describe after [Answer]: tag below)

[Answer]: A
