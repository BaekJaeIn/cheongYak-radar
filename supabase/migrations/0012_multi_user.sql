-- v6 — 회원제 전환 (FR-13~15, U8 infrastructure-design §1)
-- additive: anon 정책 제거는 0013에서 (BR-U8-12 — 구버전 앱과 공존).

-- ── 1) household_profile 회원화 (C-7 해제 → 회원당 1행) ──────────────────
alter table household_profile drop constraint if exists household_profile_id_check;
alter table household_profile alter column id drop default;
alter table household_profile alter column id type bigint;
create sequence if not exists household_profile_id_seq owned by household_profile.id;
select setval('household_profile_id_seq', coalesce((select max(id) from household_profile), 1));
alter table household_profile alter column id set default nextval('household_profile_id_seq');

alter table household_profile
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
create unique index if not exists idx_household_profile_user on household_profile (user_id);

comment on table household_profile is
  '가구 프로필 — 회원당 1건(user_id). 기존 단일 행은 user_id null → 귀속 트리거 대기. (v6 C-12, FR-14.1)';

-- RLS: 본인 행만 (기존: 정책 없음 = service_role만 접근)
drop policy if exists profile_own_select on household_profile;
create policy profile_own_select on household_profile
  for select to authenticated using (user_id = auth.uid());
drop policy if exists profile_own_insert on household_profile;
create policy profile_own_insert on household_profile
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists profile_own_update on household_profile;
create policy profile_own_update on household_profile
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- RPC 회원화 — 구 시그니처 제거는 코드와 동시 배포 (롤아웃 §6)
drop function if exists upsert_household_profile(jsonb);
create or replace function upsert_household_profile(p jsonb, p_user_id uuid)
returns household_profile
language plpgsql
security definer
set search_path = public
as $$
declare
  result household_profile;
begin
  insert into household_profile as h (user_id, profile)
  values (p_user_id, p)
  on conflict (user_id) do update set
    profile    = excluded.profile,
    updated_at = now()
  returning h.* into result;
  return result;
end;
$$;
revoke all on function upsert_household_profile(jsonb, uuid) from anon;

-- ── 2) recommendations 회원화 (기존 행은 재계산으로 재생성 — FR-15.1) ────
delete from recommendations;
alter table recommendations drop constraint if exists recommendations_pkey;
alter table recommendations
  add column if not exists user_id uuid not null references auth.users(id) on delete cascade;
alter table recommendations add primary key (user_id, notice_id);
create index if not exists idx_recommendations_user_score on recommendations (user_id, score desc);

-- authenticated 본인 행 읽기 (anon 정책 제거는 0013)
drop policy if exists recommendations_own_read on recommendations;
create policy recommendations_own_read on recommendations
  for select to authenticated using (user_id = auth.uid());

drop function if exists upsert_recommendations(jsonb);
create or replace function upsert_recommendations(p jsonb, p_user_id uuid)
returns table(notice_id text, was_inserted boolean)
language plpgsql
security definer
set search_path = public
as $$
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

drop function if exists prune_recommendations(text[]);
create or replace function prune_recommendations(keep_ids text[], p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from recommendations
  where user_id = p_user_id and not (notice_id = any (keep_ids));
end;
$$;
revoke all on function prune_recommendations(text[], uuid) from anon;

-- ── 3) push_subscriptions — 회원 귀속 (FR-14.3) ─────────────────────────
alter table push_subscriptions
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists idx_push_subscriptions_user on push_subscriptions (user_id);

-- ── 4) bookmarks 신설 (FR-14.4) ────────────────────────────────────────
create table if not exists bookmarks (
  user_id    uuid not null references auth.users(id) on delete cascade,
  notice_id  text not null references notices(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, notice_id)
);
alter table bookmarks enable row level security;
drop policy if exists bookmarks_own_select on bookmarks;
create policy bookmarks_own_select on bookmarks
  for select to authenticated using (user_id = auth.uid());
drop policy if exists bookmarks_own_insert on bookmarks;
create policy bookmarks_own_insert on bookmarks
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists bookmarks_own_delete on bookmarks;
create policy bookmarks_own_delete on bookmarks
  for delete to authenticated using (user_id = auth.uid());

-- notices: authenticated 읽기 (anon 제거는 0013)
drop policy if exists notices_auth_read on notices;
create policy notices_auth_read on notices
  for select to authenticated using (true);

-- ── 5) 기존 데이터 귀속 트리거 (FR-15, BR-U8-10) ───────────────────────
create or replace function claim_legacy_data_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email = 'jiback96@naver.com' then
    update household_profile set user_id = new.id, updated_at = now() where user_id is null;
    update push_subscriptions set user_id = new.id where user_id is null;
  end if;
  return new;
exception when others then
  -- 귀속 실패가 가입을 막지 않도록 격리
  raise warning '[claim trigger] 실패(무시): %', sqlerrm;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_claim on auth.users;
create trigger on_auth_user_created_claim
  after insert on auth.users
  for each row execute function claim_legacy_data_on_signup();

-- ── 6) 0011 개정 — 프로필 변경 시 해당 회원만 재계산 (D-5) ──────────────
create or replace function trigger_recompute_on_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_key text;
begin
  begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'collect_url';
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'service_role_key';
    if v_url is not null and v_key is not null then
      perform net.http_post(
        url     := v_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body    := jsonb_build_object('action', 'recompute', 'userId', new.user_id)
      );
    else
      raise warning '[recompute trigger] Vault 시크릿(collect_url/service_role_key) 미설정 — 건너뜀';
    end if;
  exception when others then
    raise warning '[recompute trigger] 실패(무시): %', sqlerrm;
  end;
  return null;
end;
$$;
