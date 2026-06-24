# U5 개인화·PWA·알림 — Deployment Architecture

## 구성
```
[Vercel] Next.js + next-pwa
   ├ manifest.json + sw.js (앱셸/정적 캐시, 설치)
   ├ RSC/Client 화면 + /api/subscribe (구독 등록, anon)
   └ BookmarksPage (client, localStorage + anon notices 조회)
[Supabase] push_subscriptions(0002, anon INSERT / service SELECT·DELETE)
[Edge: collect] recompute.newIds → PushDispatcher(web-push, VAPID private) → 기기
```

## 배포 단계
- `npm i -D next-pwa` + `npm i web-push`(서버 발송용은 Edge에서 npm: import). next.config.js 래핑.
- VAPID 키 생성 1회 → Vercel(public/private)·Supabase Edge secret(private) 등록.
- `supabase functions deploy collect` (web-push 추가 반영).

## 검증 (Build & Test)
- `npm run build`(PWA 산출물 생성), Lighthouse PWA 설치 가능 확인.
- 구독: NotifyToggle 허용 → push_subscriptions INSERT 확인.
- 발송: collect 수동 호출(mock+프로필) → 신규추천 발생 시 알림 수신.

## 주의
- 로컬 dev는 next-pwa 비활성(SW 캐시 혼선 방지). 프로덕션만 활성.
- iOS Safari Web Push는 PWA 설치 후 제한적 — 안내 문구 권장.
