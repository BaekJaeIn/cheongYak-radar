-- v6 — anon 접근 차단 (BR-U8-12). ⚠️ 신규 코드(로그인) 배포 확인 후 적용 — 롤아웃 §6 3단계.
-- 이전(0012)에서 authenticated 정책을 미리 추가했으므로 여기서는 anon 정책만 제거.

drop policy if exists notices_anon_read on notices;
drop policy if exists recommendations_anon_read on recommendations;
drop policy if exists push_anon_insert on push_subscriptions;
