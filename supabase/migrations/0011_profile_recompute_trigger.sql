-- 프로필 변경 시 추천 자동 재계산 (Vercel 의존 제거).
-- 원인: Vercel→Edge Function HTTP 호출은 게이트웨이가 레거시 JWT만 받아,
--       Vercel이 새 키(sb_secret_)면 recompute가 조용히 실패 → 추천이 갱신 안 됨.
-- 해결: DB가 household_profile 변경 시 pg_net으로 직접 recompute 호출.
--       URL/키는 Vault에서 조회(레거시 service_role JWT). cron과 동일 시크릿 사용.
-- 전제(1회, SQL Editor): collect_url / service_role_key(레거시 eyJ... JWT) Vault 생성.

create extension if not exists pg_net;
create extension if not exists supabase_vault;

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
        body    := '{"action":"recompute"}'::jsonb
      );
    else
      raise warning '[recompute trigger] Vault 시크릿(collect_url/service_role_key) 미설정 — 건너뜀';
    end if;
  exception when others then
    -- 트리거 실패가 프로필 저장을 막지 않도록 격리
    raise warning '[recompute trigger] 실패(무시): %', sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists on_profile_change_recompute on household_profile;
create trigger on_profile_change_recompute
  after insert or update on household_profile
  for each row execute function trigger_recompute_on_profile_change();
