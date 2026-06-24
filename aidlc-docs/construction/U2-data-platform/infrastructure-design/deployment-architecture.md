# U2 데이터 플랫폼 — Deployment Architecture

## 1. 배포 구성도 (텍스트)
```
[GitHub repo]
   └── supabase/migrations/*.sql
            |
   supabase db push (CLI)         Vercel (Next.js)
            |                          |
            v                          v
   [Supabase Project: PostgreSQL]  <-- anon key (RSC 조회, RLS)
     - notices, push_subscriptions     service_role (Edge Function 쓰기)
     - RLS policies
     - indexes
```

## 2. 마이그레이션 흐름 (Q-I1=A)
- 스키마 변경은 `supabase/migrations/<timestamp>_<name>.sql` 추가로만.
- 로컬: `supabase start` → `supabase db reset`(마이그레이션+seed 재적용)으로 검증.
- 원격 반영: `supabase db push` (또는 CI에서 실행).
- 첫 마이그레이션: `0001_init_notices.sql`(테이블+인덱스+RLS), `0002_push_subscriptions.sql`.

## 3. 환경 구성
| 환경 | 용도 | DB |
|---|---|---|
| Local | 개발/테스트 | `supabase start`(로컬 Postgres) + seed 목업 |
| Production | 운영 | Supabase Free tier 프로젝트 |
> 개인용이라 staging 생략. Local↔Prod 2단계.

## 4. 접근 경로 & 키 경계 (NFR-3)
- **읽기(RSC)**: Next.js 서버 컴포넌트 → anon key → PostgREST → RLS(select). anon key는 RLS로 보호되므로 공개 허용.
- **쓰기(수집)**: U1 Edge Function → service_role key → 직접 테이블 write. service_role은 Edge Function 시크릿에만.
- **구독 등록**: 클라 → anon key → push_subscriptions INSERT(정책 허용).

## 5. 용량/비용 (Free tier)
- 데이터량: 공고 수천 건 수준 예상 → Free tier(500MB) 충분.
- 인덱스 최소화로 쓰기 비용 억제.
- 백업: Free tier 기본 정책 의존(개인용 허용 리스크).

## 6. 가용성/회복 (경량, 확장 Off)
- 단일 Supabase 프로젝트. 장애 시 재수집으로 복구 가능(원천이 외부 공공데이터, raw 보존).
- 마이그레이션은 멱등(`if not exists`)으로 재실행 안전.

## 7. 다음 단위 연계
- U1: Edge Function이 service_role로 `notices` upsert.
- U3/U4: RSC가 anon으로 `notices` 조회.
- U5: 클라가 anon으로 `push_subscriptions` INSERT, Edge Function이 service_role로 SELECT 발송.
