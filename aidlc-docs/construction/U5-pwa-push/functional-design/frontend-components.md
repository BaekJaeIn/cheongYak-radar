# U5 개인화·PWA·알림 — Frontend Components

> 결정: 북마크 localStorage(A), Push 구독+발송(A), next-pwa(A), 발송은 collect Edge Function(A).

## 화면/요소
```
app/bookmarks/page.tsx (BookmarksPage, client) — 북마크 목록
RecommendationCard / DetailHeader 에 BookmarkButton(C21) 추가
RootLayout 에 InstallPrompt(C23) + NotifyToggle(C24) (헤더/설정)
```

## 컴포넌트
### BookmarkButton (C21) — US-5.1 (client)
- props: `{ noticeId }`. BookmarkStore.toggle. 별/하트 토글 표시. `data-testid="bookmark-btn-{id}"`.

### BookmarksPage (`/bookmarks`, C22) — US-5.2 (client)
- BookmarkStore.list() → 해당 공고 조회(클라이언트에서 `/api/notices?ids=` 또는 anon supabase). 마감 임박 정렬, 만료 흐림.
- 빈 상태: "북마크한 공고가 없어요".

### InstallPrompt (C23) — US-5.3 (client)
- `beforeinstallprompt` 가로채 설치 버튼 노출. 이미 설치/미지원이면 숨김. `data-testid="install-prompt"`.

### NotifyToggle (C24) — US-5.4 (client)
- 알림 권한 요청 + 구독 등록/해제. 상태(허용/거부/미설정) 표시. `data-testid="notify-toggle"`.

## 클라이언트 모듈
- `BookmarkStore` (localStorage) — list/toggle/has
- `PushSubscriptionClient` — requestPermissionAndSubscribe/register/unsubscribe (서비스워커 + VAPID public)

## 서버(비UI)
- `PushDispatcher` — collect Edge Function에서 신규추천 발송(web-push, VAPID). (US-6.7)

## PWA 자산
- `public/manifest.json`, 아이콘(192/512), next-pwa 설정(next.config.js 래핑), 서비스워커(자동 생성).
