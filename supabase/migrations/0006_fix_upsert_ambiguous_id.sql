-- Fix: "column reference id/notice_id is ambiguous" in upsert RPCs.
-- 원인: RETURNS TABLE의 OUT 컬럼(id/notice_id)이 ON CONFLICT (id)의 바레 컬럼명과
--       plpgsql 변수 해석에서 충돌. `#variable_conflict use_column`로 컬럼 우선 해석.
-- additive — create or replace (0004/0005 함수 재정의)

create or replace function upsert_notices(p jsonb)
returns table(id text, was_inserted boolean)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
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
    eligibility_summary = coalesce(n.eligibility_summary, excluded.eligibility_summary),
    eligibility         = coalesce(n.eligibility, excluded.eligibility),
    raw          = excluded.raw,
    updated_at   = now()
  returning n.id, (xmax = 0) as was_inserted;
end;
$$;

revoke all on function upsert_notices(jsonb) from anon;

create or replace function upsert_recommendations(p jsonb)
returns table(notice_id text, was_inserted boolean)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  return query
  insert into recommendations as r (
    notice_id, score, eligible_types, reason_summary, score_breakdown, computed_at
  )
  select
    x.notice_id, x.score, coalesce(x.eligible_types, '{}'), x.reason_summary,
    x.score_breakdown, now()
  from jsonb_to_recordset(p) as x(
    notice_id text, score numeric, eligible_types text[],
    reason_summary text, score_breakdown jsonb
  )
  on conflict (notice_id) do update set
    score           = excluded.score,
    eligible_types  = excluded.eligible_types,
    reason_summary  = excluded.reason_summary,
    score_breakdown = excluded.score_breakdown,
    computed_at     = now()
  returning r.notice_id, (xmax = 0) as was_inserted;
end;
$$;

revoke all on function upsert_recommendations(jsonb) from anon;
