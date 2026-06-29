-- 푸시 알림 테스트용 cron: 매일 10:30 KST = 01:30 UTC.
-- 전체 구독자에게 신규추천 여부와 무관하게 테스트 알림 무조건 발송(action=test-push).
-- app.settings(collect_url/service_role_key)는 0003/0007과 동일 전제.
-- ⚠️ 테스트가 끝나면 제거 권장: select cron.unschedule('test-push-1030');

select cron.unschedule('test-push-1030')
where exists (select 1 from cron.job where jobname = 'test-push-1030');

select cron.schedule(
  'test-push-1030',
  '30 1 * * *',          -- 01:30 UTC = 10:30 KST
  $$
  select net.http_post(
    url     := current_setting('app.settings.collect_url', true),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body    := '{"action":"test-push"}'::jsonb
  );
  $$
);
