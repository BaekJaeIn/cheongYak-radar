# U5 개인화·PWA·알림 — Code Summary

## 생성 파일
### 북마크 (localStorage)
- `src/features/bookmarks/store.ts` (parseList/toggleInList 순수 + BookmarkStore)
- `src/features/bookmarks/BookmarkButton.tsx` (client) · `src/app/bookmarks/page.tsx` (client)
- `src/lib/supabase/browser.ts` (anon 브라우저 클라이언트)

### Web Push (구독)
- `src/features/notifications/push-client.ts` (subscribe/unsubscribe, VAPID)
- `src/features/notifications/NotifyToggle.tsx` (client)
- `src/app/api/subscribe/route.ts` (POST, anon upsert push_subscriptions)

### Web Push (발송, Deno)
- `supabase/functions/collect/push.ts` (dispatch, npm:web-push, 410 정리)
- `supabase/functions/collect/index.ts` — triggerPush → push.dispatch 실구현(US-6.7)

### PWA
- `public/manifest.json`, `public/sw.js` (앱셸 캐시 + push/notificationclick)
- `src/features/pwa/RegisterSW.tsx`, `src/features/pwa/InstallPrompt.tsx`
- `src/app/layout.tsx` (manifest 링크, SW 등록, InstallPrompt/NotifyToggle, 관심 탭)
- `.env.example` — NEXT_PUBLIC_VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY

### 테스트
- `src/features/bookmarks/__tests__/store.test.ts`

## 스토리 추적
| Story | 상태 | 구현 |
|---|---|---|
| US-5.1 북마크 | ✅ | store + BookmarkButton(피드/상세/관심) |
| US-5.2 관심목록 | ✅ | /bookmarks(마감정렬·만료흐림) |
| US-5.3 PWA 설치/오프라인 | ✅ | manifest + sw.js + RegisterSW + InstallPrompt |
| US-5.4 Web Push 구독 | ✅ | push-client + NotifyToggle + /api/subscribe |
| US-6.7 신규추천 발송 | ✅ | push.ts dispatch + collect 연결 |

## 검증
- **vitest**: 99 passed (기존 94 + U5 5: bookmarks store).
- **tsc --noEmit**: 클린(applicationServerKey BufferSource 캐스팅).
- **next build**: 성공 — `/bookmarks`(○), `/api/subscribe`(ƒ) 포함 전 라우트 컴파일.

## 설계 대비 변경/주의
- **PWA 수동 구현**(manifest + sw.js)으로 결정 — Q-FU5-3=A(next-pwa) 대신 **빌드 안정성** 우선(추가 의존성 없이 동일 기능: 설치·오프라인·푸시수신). next-pwa는 추후 교체 가능.
- 아이콘(`/icon-192.png`,`/icon-512.png`)은 **추가 필요**(플레이스홀더 경로). 없어도 빌드·설치 동작, 아이콘만 누락.
- VAPID 키 `npx web-push generate-vapid-keys`로 생성 후 env 등록 필요(미설정 시 발송 자동 스킵).
- iOS Safari Web Push는 홈화면 설치 후 제한적.
