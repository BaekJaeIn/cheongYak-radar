-- 0014: upsert_recommendations 버그 수정 (v6 롤아웃 검증 중 발견)
-- returns table(notice_id, …)가 만드는 plpgsql 변수가 on conflict (user_id, notice_id)의
-- 컬럼 참조와 충돌해 호출이 항상 42702(ambiguous)로 실패 → Edge 회원별 catch가 삼켜
-- 추천이 0건으로 남았다. #variable_conflict use_column으로 컬럼 우선 해석.
create or replace function upsert_recommendations(p jsonb, p_user_id uuid)
returns table(notice_id text, was_inserted boolean)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  return query
  insert into recommendations as r (
    user_id, notice_id, score, eligible_types, reason_summary, score_breakdown, computed_at
  )
  select
    p_user_id, x.notice_id, x.score, coalesce(x.eligible_types, '{}'), x.reason_summary,
    x.score_breakdown, now()
  from jsonb_to_recordset(p) as x(
    notice_id text, score numeric, eligible_types text[],
    reason_summary text, score_breakdown jsonb
  )
  on conflict (user_id, notice_id) do update set
    score           = excluded.score,
    eligible_types  = excluded.eligible_types,
    reason_summary  = excluded.reason_summary,
    score_breakdown = excluded.score_breakdown,
    computed_at     = now()
  returning r.notice_id, (xmax = 0) as was_inserted;
end;
$$;
revoke all on function upsert_recommendations(jsonb, uuid) from anon;
