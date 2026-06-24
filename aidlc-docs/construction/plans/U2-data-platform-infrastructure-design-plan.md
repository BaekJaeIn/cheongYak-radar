# U2 데이터 플랫폼 — Infrastructure Design 계획

**입력**: U2 functional-design (domain-entities/business-rules/business-logic-model)
**고정 전제**: Supabase(PostgreSQL) — SPEC §2 확정. 일부 카테고리(메시징/로드밸런서/멀티테넌시)는 N/A.

아래 **질문(Q-I1 ~ Q-I3)** 의 `[Answer]:` 태그에 보기를 적고, 완료되면 "완료"라고 알려주세요.

---

## 생성될 산출물
- [x] `construction/U2-data-platform/infrastructure-design/infrastructure-design.md` — 서비스 매핑(테이블·인덱스·RLS·시드)
- [x] `construction/U2-data-platform/infrastructure-design/deployment-architecture.md` — 마이그레이션·환경·배포 흐름

---

## 결정이 필요한 질문

### Q-I1. 스키마 마이그레이션 관리 방식
DB 스키마/인덱스/RLS를 어떻게 버전 관리할까요?

A) **Supabase CLI 마이그레이션** — `supabase/migrations/*.sql` 파일로 코드화(레포 추적, 재현 가능) — *추천*

B) **Supabase 대시보드 수동** — UI로 직접 생성(빠르지만 추적 약함)

C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

### Q-I2. 인덱스 전략 (Free tier · 개인용)
조회 인덱스를 어느 수준으로 만들까요?

A) **핵심 단일 인덱스 + 대표 복합 1~2개** — `apply_end`, `region_sigu`, `source` 단일 + `(region_sigu, apply_end)`, `(apply_end, id)` 복합 — *추천*

B) **모든 필터 컬럼 단일 인덱스만** — 단순, 복합 없음

C) **최소화** — `apply_end`만(정렬/마감), 나머지는 시퀀셜 스캔 허용(데이터 적음 가정)

D) Other (please describe after [Answer]: tag below)

[Answer]: 

---

### Q-I3. push_subscriptions 보안(RLS)
알림 구독 테이블 접근을 어떻게 둘까요? (US-5.4, BR-6.3)

A) **익명 INSERT 허용 + SELECT/DELETE는 service_role만** — 클라가 구독 등록만, 발송은 서버 — *추천*

B) **모든 접근 service_role만** — 구독 등록도 서버 라우트 경유

C) Other (please describe after [Answer]: tag below)

[Answer]: 
