# U5 개인화·PWA·알림 — Business Rules

## A. 북마크 (localStorage, Q-FU5-1=A)
### BR-U5-1. 저장
- 키 `cheongyak:bookmarks` = noticeId 배열(JSON). toggle/추가/제거. SSR 안전(클라에서만 접근).
### BR-U5-2. 목록 (US-5.2)
- BookmarkStore.list() → 공고 조회. 정렬: 마감 임박(apply_end asc, null 끝). 만료(apply_end<today)는 흐리게(비활성).
### BR-U5-3. 표시
- BookmarkButton: 현재 북마크 여부 반영(별 채움/빔). 클릭 토글 즉시 반영.

## B. PWA (next-pwa, Q-FU5-3=A)
### BR-U5-4. 설치 (US-5.3)
- manifest.json(name·아이콘·display standalone·theme). `beforeinstallprompt` 가로채 InstallPrompt 노출.
### BR-U5-5. 오프라인
- 서비스워커(next-pwa/workbox)로 앱셸·정적자원 캐시. 오프라인 시 캐시된 화면 열람.
- 추천 데이터는 네트워크 우선(no-store), 오프라인이면 마지막 캐시 또는 안내.

## C. Web Push (구독, Q-FU5-2=A)
### BR-U5-6. 구독 (US-5.4)
- NotifyToggle: Notification 권한 요청 → 서비스워커 `pushManager.subscribe(VAPID public)` → 구독정보를 `push_subscriptions`(0002)에 anon INSERT.
- 권한 거부/미지원 시 안내, 토글 비활성.
### BR-U5-7. 구독 해제
- unsubscribe → 로컬 구독 해제(+가능 시 서버 레코드 비활성). 최소 구현은 로컬 해제.

## D. Push 발송 (collect Edge Function, Q-FU5-4=A)
### BR-U5-8. 트리거 (US-6.7)
- collect 재계산 결과 **신규추천 newIds**가 있으면 PushDispatcher.dispatch(newIds) 호출(기존 triggerPush 실구현).
### BR-U5-9. 발송
- service_role로 `push_subscriptions` 전건 조회 → 각 구독에 web-push(VAPID private) 발송. 페이로드: 제목/건수/대표 공고.
- 발송 실패(만료 구독 410 등)는 개별 skip + 로그(비차단). 가능 시 만료 구독 삭제.
### BR-U5-10. 시크릿 (NFR-3)
- VAPID public은 클라(NEXT_PUBLIC_VAPID_PUBLIC_KEY), private는 서버 전용(VAPID_PRIVATE_KEY). 발송은 서버에서만.
