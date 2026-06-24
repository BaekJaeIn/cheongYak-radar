-- U6 — recommendations(추천 결과 영속화) + RLS + upsert/prune RPC
-- 스토리: US-6.5(점수·정렬), US-6.7(신규추천 diff), FR-10
-- 근거: U6 infrastructure-design.md §1, business-rules BR-U6-14~17
-- additive only — 기존 스키마/코드 보존

create table if not exists recommendations (
  notice_id            text primary key references notices(id) on delete cascade,
  score                numeric not null,
  eligible_types       text[] not null default '{}',
  reason_summary       text,
  score_breakdown      jsonb,
  first_recommended_at timestamptz not null default now(), -- 신규추천 기준(보존)
  computed_at          timestamptz not null default now()
);

create index if not exists idx_recommendations_score on recommendations (score desc);

-- RLS: 익명 읽기 허용(비민감: 점수·사유), 쓰기는 service_role만 (BR-U6-17, notices 패턴)
alter table recommendations enable row level security;
drop policy if exists recommendations_anon_read on recommendations;
create policy recommendations_anon_read on recommendations
  for select to anon using (true);

-- ── upsert RPC: firstRecommendedAt 보존, was_inserted(신규추천) 반환 ──
create or replace function upsert_recommendations(p jsonb)
returns table(notice_id text, was_inserted boolean)
language plpgsql
security definer
set search_path = public
as $$
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
    -- first_recommended_at 미갱신(보존)
  returning r.notice_id, (xmax = 0) as was_inserted; -- xmax=0 → INSERT(신규추천)
end;
$$;

revoke all on function upsert_recommendations(jsonb) from anon;

-- ── 탈락 정리: keep_ids에 없는 추천 제거 (BR-U6-14) ──
create or replace function prune_recommendations(keep_ids text[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from recommendations
  where array_length(keep_ids, 1) is null  -- keep_ids 비면 전체 삭제
     or notice_id <> all(keep_ids);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function prune_recommendations(text[]) from anon;
