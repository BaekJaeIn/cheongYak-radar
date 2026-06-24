-- U2 데이터 플랫폼 — push_subscriptions (U5 Web Push 연계)
-- 근거: U2 infrastructure-design.md, BR-6.3 (Q-I3=A)

create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  device_id   text,
  created_at  timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

-- 익명 INSERT만 허용(구독 등록). SELECT/DELETE는 service_role만(발송용).
drop policy if exists push_anon_insert on push_subscriptions;
create policy push_anon_insert on push_subscriptions
  for insert
  to anon
  with check (true);
