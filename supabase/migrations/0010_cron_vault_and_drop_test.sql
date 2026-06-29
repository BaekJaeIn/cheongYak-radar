-- cron 정비:
-- (1) 10:30 테스트 푸시 cron 제거
-- (2) 일일 수집 cron을 Vault 기반으로 전환
--     이유: Supabase에선 `ALTER DATABASE ... SET app.settings.*`가 권한상 막혀
--     (42501) app.settings 방식이 동작하지 않음 → Vault(vault.decrypted_secrets) 사용.
-- 사전 준비(1회, SQL Editor에서): collect_url / service_role_key 시크릿 생성.
--   select vault.create_secret('https://<PROJECT>.supabase.co/functions/v1/collect','collect_url');
--   select vault.create_secret('<SERVICE_ROLE_KEY>','service_role_key');

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;

-- (1) 테스트 알람 제거
select cron.unschedule('test-push-1030')
where exists (select 1 from cron.job where jobname = 'test-push-1030');

-- (2) 일일 수집 cron 재등록 (10:00 KST = 01:00 UTC), Vault에서 URL/키 조회
select cron.unschedule('collect-daily')
where exists (select 1 from cron.job where jobname = 'collect-daily');

select cron.schedule(
  'collect-daily',
  '0 1 * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'collect_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);
