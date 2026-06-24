# U5 개인화·PWA·알림 — Business Logic Model

## C10. BookmarkStore (클라이언트, localStorage)
```
list(): string[]                 // cheongyak:bookmarks
has(id): boolean
toggle(id): boolean              // 반환: 토글 후 북마크 여부
remove(id) / add(id)
```
> 순수 로직(직렬화/토글)은 테스트 대상. localStorage 접근은 try/catch(SSR/프라이빗 모드 안전).

## BookmarksPage 흐름
```
mount → ids = BookmarkStore.list()
      → 공고 조회(anon supabase, in(ids)) → 마감임박 정렬, 만료 흐림 → 목록
빈 ids → 빈 상태
```

## C11. PushSubscriptionClient (클라이언트)
```
requestPermissionAndSubscribe():
  perm = await Notification.requestPermission()
  if perm!=='granted' → null
  reg = await navigator.serviceWorker.ready
  sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: VAPID_PUBLIC })
  await register(sub)            // POST 구독정보 → push_subscriptions (anon INSERT)
unsubscribe(): 로컬 구독 해제
```

## C7. PushDispatcher (서버, collect Edge Function) — US-6.7
```
dispatch(client, newIds):
  if newIds empty → return
  subs = client.from('push_subscriptions').select(*)   // service_role
  payload = { title:'새 맞춤 공고', body:`${newIds.length}건의 새 추천`, url:'/' }
  for sub in subs:
     try webpush.send(sub, payload, VAPID)   // 실패 410 → 구독 삭제
     catch → log, continue
```
> collect index.ts의 기존 `triggerPush(client, newIds)`를 PushDispatcher.dispatch로 실구현.

## 데이터 흐름
```
[수집/재계산] recompute.newIds → PushDispatcher.dispatch → web-push → 기기 알림
[클라] NotifyToggle → PushSubscriptionClient → push_subscriptions(anon INSERT)
[클라] BookmarkButton → BookmarkStore(localStorage) → BookmarksPage
[PWA] manifest + SW(next-pwa) → 설치/오프라인 캐시
```

## 경계/오류
- 북마크: localStorage 없거나 에러 → 빈 목록(앱 정상).
- 알림: 권한 거부/미지원 → 토글 비활성 + 안내.
- 발송: 구독 만료/실패 개별 skip(비차단), 수집 흐름 영향 없음.
- VAPID private/service_role은 서버 전용(NFR-3).
