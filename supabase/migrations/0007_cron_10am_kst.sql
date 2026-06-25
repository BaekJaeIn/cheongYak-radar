-- collect 정기 실행 시각 변경: 매일 10:00 KST = 01:00 UTC (서머타임 없음 → 고정)
-- 0003의 'collect-daily'(07:00 KST)를 재등록. app.settings 전제는 0003과 동일.

select cron.unschedule('collect-daily')
where exists (select 1 from cron.job where jobname = 'collect-daily');

select cron.schedule(
  'collect-daily',
  '0 1 * * *',            -- 01:00 UTC = 10:00 KST
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
