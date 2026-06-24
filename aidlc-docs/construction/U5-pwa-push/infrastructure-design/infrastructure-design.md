# U5 개인화·PWA·알림 — Infrastructure Design

> 결정 반영: 북마크 localStorage(A), Push 구독+발송(A), next-pwa(A), 발송 collect Edge Function(A).

## 1. PWA (next-pwa)
- `next.config.js`를 `next-pwa`로 래핑(dest: public, register, skipWaiting). dev 비활성.
- `public/manifest.json` — name "청약레이더", short_name, display standalone, theme/background, 아이콘 192/512.
- 서비스워커는 next-pwa가 생성(`public/sw.js`, workbox) — 앱셸/정적 캐시. `.gitignore`에 생성물 추가.
- 커스텀 SW(푸시 수신 핸들러)가 필요하면 `worker/`(next-pwa customWorkerDir) 또는 importScripts. → push 'push'/'notificationclick' 핸들러.

## 2. Web Push
### 2.1 구독 등록 경로
- 클라 `PushSubscriptionClient` → 구독정보 등록. 방식: **Next Route Handler `/api/subscribe`(POST)** 또는 anon supabase 직접 INSERT(push_subscriptions anon insert 허용, 0002).
  - 선택: **/api/subscribe** (서버에서 정규화·검증, 일관성). GET 불필요.
### 2.2 발송 (collect Edge Function, Deno)
- `npm:web-push` import. VAPID(public/private)로 `webpush.sendNotification(sub, payload)`.
- collect `triggerPush(client, newIds)` → `PushDispatcher.dispatch`: push_subscriptions 전건(service_role) 조회 → 발송. 410/만료 → 해당 구독 delete.
- 페이로드 JSON: `{ title, body, url }`.

## 3. 데이터
- `push_subscriptions`(0002) 재사용 — 신규 마이그레이션 불필요. (SELECT/DELETE service_role, INSERT anon)
- 북마크는 DB 미사용(localStorage).

## 4. 북마크 데이터 조회
- BookmarksPage(client) → anon supabase로 `notices.in(ids)` 조회(클라이언트, RLS read). 별도 API 불필요.

## 5. 시크릿/환경 (NFR-3)
| 키 | 노출 | 용도 |
|---|---|---|
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | public | 클라 구독 applicationServerKey |
| VAPID_PRIVATE_KEY | server only | Edge 발송 서명 |
| (기존) SUPABASE_*; ANON/SERVICE | — | 구독 INSERT(anon)/발송 조회(service) |
- `.env.example`에 VAPID 키 추가. 생성: `npx web-push generate-vapid-keys`.

## 6. 배포 영향
- next-pwa로 빌드 산출물에 SW/manifest 포함. Vercel 정적 서빙.
- Edge Function에 web-push 추가(배포 시 deno 의존 fetch).

## N/A
- 신규 테이블/외부 큐 없음.
