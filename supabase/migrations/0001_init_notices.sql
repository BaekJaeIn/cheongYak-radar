-- U2 데이터 플랫폼 — notices 테이블 + 인덱스 + RLS + upsert RPC
-- 스토리: US-2.1(upsert 스키마), US-2.2(인덱스), US-2.3(RLS)
-- 근거: U2 infrastructure-design.md, business-rules.md

-- ── 테이블 ────────────────────────────────────────────────
create table if not exists notices (
  id            text primary key,                       -- "{source}:{source_no}" (BR-1)
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
  updated_at    timestamptz not null default now(),
  -- 커서 정렬용 생성 컬럼: apply_end NULL을 마지막으로 (BR-4/BR-5)
  sort_apply_end date generated always as (coalesce(apply_end, '9999-12-31')) stored
);

-- ── 인덱스 (Q-I2=A: 핵심 단일 + 대표 복합) ─────────────────
create index if not exists idx_notices_region_sigu     on notices (region_sigu);
create index if not exists idx_notices_source          on notices (source);
create index if not exists idx_notices_apply_end       on notices (apply_end);
create index if not exists idx_notices_newlywed        on notices (newlywed) where newlywed = true;
create index if not exists idx_notices_created_at      on notices (created_at);
create index if not exists idx_notices_region_applyend on notices (region_sigu, apply_end);
create index if not exists idx_notices_sort_applyend_id on notices (sort_apply_end, id); -- 커서

-- ── RLS: 익명 읽기전용 (US-2.3, BR-6.1/6.2) ────────────────
alter table notices enable row level security;

drop policy if exists notices_anon_read on notices;
create policy notices_anon_read on notices
  for select
  to anon
  using (true);
-- INSERT/UPDATE/DELETE 정책 없음 → service_role(권한 우회)만 쓰기 가능

-- ── upsert RPC (BR-2: 요약·created_at 보존, 신규 여부 반환) ──
-- service_role/Edge Function에서 호출. 익명 실행 차단.
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
    supply_type, newlywed, pre_newlywed, priority, url, eligibility_summary, raw
  )
  select
    x.id, x.source_no, x.source, x.title, x.region_sido, x.region_sigu,
    x.area_min, x.area_max, x.notice_date, x.apply_start, x.apply_end, x.winner_date,
    x.supply_type, coalesce(x.newlywed, false), coalesce(x.pre_newlywed, false),
    x.priority, x.url, x.eligibility_summary, x.raw
  from jsonb_to_recordset(p) as x(
    id text, source_no text, source text, title text, region_sido text, region_sigu text,
    area_min numeric, area_max numeric, notice_date date, apply_start date, apply_end date,
    winner_date date, supply_type text, newlywed boolean, pre_newlywed boolean,
    priority text, url text, eligibility_summary text, raw jsonb
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
    -- 기존 요약 보존, 없을 때만 새 값 (BR-2.3)
    eligibility_summary = coalesce(n.eligibility_summary, excluded.eligibility_summary),
    raw          = excluded.raw,
    -- created_at 미갱신(보존), updated_at 갱신
    updated_at   = now()
  returning n.id, (xmax = 0) as was_inserted; -- xmax=0 → INSERT
end;
$$;

revoke all on function upsert_notices(jsonb) from anon;
