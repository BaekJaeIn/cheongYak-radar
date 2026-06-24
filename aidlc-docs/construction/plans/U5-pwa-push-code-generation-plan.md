# U5 개인화·PWA·알림 — Code Generation 계획 (PART 1)

**단위**: U5(최종). **스토리**: US-5.1~5.4 + US-6.7(push wiring).
**재사용**: push_subscriptions(0002), collect index.ts triggerPush 훅, feed/detail 컴포넌트.

## 생성 단계 (PART 2)
### Step 1: 북마크 (localStorage)
- [x] `src/features/bookmarks/store.ts` (순수 로직, 테스트 대상) — list/has/toggle/add/remove
- [x] `src/features/bookmarks/BookmarkButton.tsx` (client)
- [x] `src/app/bookmarks/page.tsx` (client) — 목록·마감정렬·만료흐림 + 네비 탭 추가

### Step 2: Web Push (구독)
- [x] `src/features/notifications/push-client.ts` — requestPermissionAndSubscribe/unsubscribe (VAPID public, base64→Uint8Array)
- [x] `src/features/notifications/NotifyToggle.tsx` (client)
- [x] `src/app/api/subscribe/route.ts` (POST) — 구독 등록(anon supabase INSERT)

### Step 3: Web Push (발송, Deno)
- [x] `supabase/functions/collect/push.ts` — `dispatch(client, newIds)` (npm:web-push, VAPID, 만료 410 정리)
- [x] `supabase/functions/collect/index.ts` 수정 — triggerPush → push.dispatch 실구현

### Step 4: PWA
- [x] `public/manifest.json` + 아이콘 placeholder(192/512 경로) 안내
- [x] `next.config.js` — next-pwa 래핑 / `package.json` devDep next-pwa, dep web-push(서버), `.gitignore`(sw 생성물)
- [x] `src/app/layout.tsx` — manifest 링크 + InstallPrompt 마운트
- [x] `src/features/pwa/InstallPrompt.tsx` (client)
- [x] `.env.example` — VAPID 키 추가

### Step 5: 테스트 + 검증 + 문서
- [x] `src/features/bookmarks/__tests__/store.test.ts`
- [x] vitest + tsc + next build 확인
- [x] `aidlc-docs/construction/U5-pwa-push/code/U5-code-summary.md`

## 스토리 추적
| Story | 구현 |
|---|---|
| US-5.1 북마크 | store + BookmarkButton |
| US-5.2 관심목록 | /bookmarks |
| US-5.3 PWA 설치/오프라인 | next-pwa + manifest + InstallPrompt |
| US-5.4 Web Push 구독 | push-client + NotifyToggle + /api/subscribe |
| US-6.7 신규추천 발송 | push.ts(dispatch) + index 연결 |

## 총 5단계.
