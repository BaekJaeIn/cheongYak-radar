-- U1 — collect Edge Function 정기 실행 (US-1.1)
-- 매일 07:00 KST = 22:00 UTC (한국은 서머타임 없음 → 고정 오프셋)
-- 전제: pg_cron, pg_net 확장. service_role 키는 DB 설정(app.settings.service_role_key)으로 주입.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 배포 시 1회 설정 (값은 실제 키로 교체, 커밋 금지):
--   alter database postgres set app.settings.service_role_key = '<SERVICE_ROLE_KEY>';
--   alter database postgres set app.settings.collect_url = 'https://<PROJECT>.functions.supabase.co/collect';

-- 기존 동일 작업 제거 후 재등록 (멱등)
select cron.unschedule('collect-daily')
where exists (select 1 from cron.job where jobname = 'collect-daily');

select cron.schedule(
  'collect-daily',
  '0 22 * * *',
  $$
  select net.http_post(
    url     := current_setting('app.settings.collect_url', true),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body    := '{}'::jsonb
  );
  $$
);
