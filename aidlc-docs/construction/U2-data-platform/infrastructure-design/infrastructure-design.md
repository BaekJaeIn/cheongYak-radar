# U2 데이터 플랫폼 — Infrastructure Design

> 결정: Supabase CLI 마이그레이션(Q-I1=A), 핵심 단일+대표 복합 인덱스(Q-I2=A), 익명 INSERT+나머지 service_role(Q-I3=A).
> 논리 컴포넌트(C5 Upserter, C8 Repository, Notice/PushSubscription 엔티티)를 Supabase 서비스에 매핑.

## 1. 서비스 매핑
| 논리 요소 | Supabase 서비스 |
|---|---|
| Notice 저장소 | PostgreSQL 테이블 `notices` |
| PushSubscription 저장소 | PostgreSQL 테이블 `push_subscriptions` |
| 접근 제어 | Row Level Security (RLS) 정책 |
| 조회(C8) | PostgREST(anon key) — 서버 컴포넌트에서 호출 |
| 쓰기(C5) | service_role(Edge Function) |
| 스키마 버전관리 | Supabase CLI `supabase/migrations/*.sql` |

> **N/A**: 메시징/큐, 로드밸런서, API Gateway, 멀티테넌시 — 단일 BaaS·개인용으로 불필요.

## 2. 테이블 DDL (목표 스키마)

```sql
-- notices
create table if not exists notices (
  id            text primary key,             -- "{source}:{source_no}" (BR-1)
  source_no     text not null,
  source        text not null check (source in ('apt','lh','sh','private')),
  title         text not null,
  region_sido   text,
  region_sigu   text,
  area_min      numeric,
  area_max      numeric,
  notice_date   date,
  apply_start   date,
  apply_end     date,
  winner_date   date,
  supply_type   text,
  newlywed      boolean not null default false,
  pre_newlywed  boolean not null default false,
  priority      text check (priority in ('1순위','2순위','무순위')),
  url           text,
  eligibility_summary text,
  raw           jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- push_subscriptions
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  device_id   text,
  created_at  timestamptz not null default now()
);
```

## 3. 인덱스 (Q-I2=A)
```sql
-- 단일 (필터)
create index if not exists idx_notices_region_sigu on notices (region_sigu);
create index if not exists idx_notices_source      on notices (source);
create index if not exists idx_notices_apply_end   on notices (apply_end);
create index if not exists idx_notices_newlywed    on notices (newlywed) where newlywed = true;
create index if not exists idx_notices_created_at  on notices (created_at);
-- 대표 복합
create index if not exists idx_notices_region_applyend on notices (region_sigu, apply_end);
create index if not exists idx_notices_applyend_id     on notices (apply_end, id);  -- 커서 정렬(BR-5)
```
> 면적(area_min/max) 범위 필터는 데이터량이 적어 단일/복합 인덱스 생략(시퀀셜 허용). 필요 시 추후 추가.

## 4. RLS 정책
```sql
alter table notices enable row level security;
alter table push_subscriptions enable row level security;

-- notices: 익명 읽기전용 (BR-6.1)
create policy notices_anon_read on notices
  for select to anon using (true);
-- 쓰기 정책 없음 → service_role(권한 우회)만 INSERT/UPDATE 가능 (BR-6.2)

-- push_subscriptions: 익명 INSERT만, SELECT/DELETE는 service_role (Q-I3=A, BR-6.3)
create policy push_anon_insert on push_subscriptions
  for insert to anon with check (true);
-- SELECT/DELETE 정책 없음 → service_role만
```

## 5. KST 날짜 처리 (BR-8)
- 쿼리에서 `(timezone('Asia/Seoul', now()))::date` 를 "오늘" 기준으로 사용.
- `is_new`: `(timezone('Asia/Seoul', created_at))::date = (timezone('Asia/Seoul', now()))::date`
- `hideExpired`: `apply_end is null or apply_end >= (timezone('Asia/Seoul', now()))::date`

## 6. 환경변수 / 시크릿 (NFR-3)
| 키 | 사용처 | 노출 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 클라/서버 | 공개 가능 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 서버 컴포넌트 조회 | 공개 가능(RLS로 보호) |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function 쓰기 | **서버 전용** |
| `ANTHROPIC_API_KEY` | 요약(U4/U1) | **서버 전용** |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Push(U5) | private는 서버 전용 |

## 7. 시드/목업 (US-1.7 연계)
- 로컬 개발: `supabase/seed.sql`에 목업 notices 일부 적재(스키마 검증용). 실제 목업 생성은 U1 MockDataProvider.
