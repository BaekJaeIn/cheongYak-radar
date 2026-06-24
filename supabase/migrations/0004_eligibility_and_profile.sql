-- v2 변경 — 부부 전용 추천 앱
-- notices에 구조화 자격조건(eligibility JSONB) 추가 + household_profile 단일행 테이블
-- 스토리: US-6.1(프로필 저장), US-6.3(자격 판정 입력), FR-8/FR-9
-- 근거: requirements.md §12.4, components.md (EligibilityCriteria, HouseholdProfile), unit-of-work.md U6
-- additive only — 기존 0001~0003 스키마/코드 보존

-- ── notices.eligibility (CriteriaExtractor 결과, FR-9 입력) ──
-- 형태: { supplyTypes[], incomePctLimit?, assetLimit?, carLimit?,
--         residencyReq?{region,months}, savingsReq?{months,count},
--         preNewlywedAllowed?, firstTimeEligible? }  (베스트에포트, 부분 채움 허용)
alter table notices add column if not exists eligibility jsonb;

comment on column notices.eligibility is
  'CriteriaExtractor가 채우는 구조화 자격조건(EligibilityCriteria). 베스트에포트 — null/부분 허용.';

-- 공급유형 등 자격 필터링용 GIN 인덱스 (포함 연산 @> 대응)
create index if not exists idx_notices_eligibility_gin on notices using gin (eligibility);

-- ── household_profile: 단일 가구(2인) 프로필 1건 (C-7, FR-8) ──
-- 단일행 강제: id 고정값(1) + CHECK. 민감정보(소득·자산) → anon 접근 차단.
create table if not exists household_profile (
  id          smallint primary key default 1 check (id = 1),
  -- HouseholdProfile 스냅샷 (household-profile.md §10 구조, 로컬 전용 상세)
  -- maritalStatus, homeless, headOfHousehold, children, members,
  -- self/partner{birthYear, monthlyIncome, savingsAccount{...}},
  -- assets{financial,carValue}, residence{sido,sigu,since},
  -- firstTimeBuyer, preferences{areaMin,areaMax,regions[],sources[]}
  profile     jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table household_profile is
  '단일 가구 프로필 1건(id=1 고정). 민감정보 포함 — service_role만 접근. (C-7, FR-8)';

-- ── RLS: 익명 접근 전면 차단 (민감정보 — 0001 notices와 달리 anon read 없음) ──
alter table household_profile enable row level security;
-- SELECT/INSERT/UPDATE/DELETE 정책 미부여 → service_role(권한 우회)만 접근 가능.

-- ── 프로필 upsert RPC (단일행 보장, service_role 전용) ──
create or replace function upsert_household_profile(p jsonb)
returns household_profile
language plpgsql
security definer
set search_path = public
as $$
declare
  result household_profile;
begin
  insert into household_profile as h (id, profile)
  values (1, p)
  on conflict (id) do update set
    profile    = excluded.profile,
    updated_at = now()
  returning h.* into result;
  return result;
end;
$$;

revoke all on function upsert_household_profile(jsonb) from anon;

-- ── upsert_notices 재정의: eligibility(JSONB) 적재 추가 (0001 함수 대체) ──
-- 정책: eligibility_summary처럼 기존 값 보존(coalesce 기존 우선) — 재추출 비용·안정성 (BR-2.3 준용).
create or replace function upsert_notices(p jsonb)
returns table(id text, was_inserted boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  insert into notices as n (
    id, source_no, source, title, region_sido, region_sigu,
    area_min, area_max, notice_date, apply_start, apply_end, winner_date,
    supply_type, newlywed, pre_newlywed, priority, url, eligibility_summary, eligibility, raw
  )
  select
    x.id, x.source_no, x.source, x.title, x.region_sido, x.region_sigu,
    x.area_min, x.area_max, x.notice_date, x.apply_start, x.apply_end, x.winner_date,
    x.supply_type, coalesce(x.newlywed, false), coalesce(x.pre_newlywed, false),
    x.priority, x.url, x.eligibility_summary, x.eligibility, x.raw
  from jsonb_to_recordset(p) as x(
    id text, source_no text, source text, title text, region_sido text, region_sigu text,
    area_min numeric, area_max numeric, notice_date date, apply_start date, apply_end date,
    winner_date date, supply_type text, newlywed boolean, pre_newlywed boolean,
    priority text, url text, eligibility_summary text, eligibility jsonb, raw jsonb
  )
  on conflict (id) do update set
    source_no    = excluded.source_no,
    source       = excluded.source,
    title        = excluded.title,
    region_sido  = excluded.region_sido,
    region_sigu  = excluded.region_sigu,
    area_min     = excluded.area_min,
    area_max     = excluded.area_max,
    notice_date  = excluded.notice_date,
    apply_start  = excluded.apply_start,
    apply_end    = excluded.apply_end,
    winner_date  = excluded.winner_date,
    supply_type  = excluded.supply_type,
    newlywed     = excluded.newlywed,
    pre_newlywed = excluded.pre_newlywed,
    priority     = excluded.priority,
    url          = excluded.url,
    -- 기존 요약/자격조건 보존, 없을 때만 새 값 (BR-2.3 준용)
    eligibility_summary = coalesce(n.eligibility_summary, excluded.eligibility_summary),
    eligibility         = coalesce(n.eligibility, excluded.eligibility),
    raw          = excluded.raw,
    updated_at   = now()
  returning n.id, (xmax = 0) as was_inserted;
end;
$$;

revoke all on function upsert_notices(jsonb) from anon;
