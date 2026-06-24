# U5 개인화·PWA·알림 — Functional Design 계획

**입력**: stories E5(US-5.1~5.4) + US-6.7(신규추천 Push wiring), components C7/C10/C11/C21~C24, push_subscriptions(0002), collect triggerPush 훅.
**화면/기능**: 북마크(`/bookmarks`) · PWA 설치·오프라인 · Web Push.

아래 `[Answer]:`에 보기를 적고 "완료". → frontend-components.md / business-rules.md / business-logic-model.md.

### Q-FU5-1. 북마크 저장 (US-5.1/5.2)

A) **localStorage(기기 로컬)** — 인증 없음 전제(Q3=A) 일관 — _추천_
B) DB(push_subscriptions처럼 device_id)
C) Other
[Answer]: A

### Q-FU5-2. Web Push 범위 (US-5.4, US-6.7)

A) **구독 + 발송 모두** — 클라 구독 등록 + 수집 후 신규추천 발송(triggerPush 실구현) — _추천_
B) 구독만(발송 보류)
C) Other
[Answer]: A

### Q-FU5-3. PWA 구현

A) **next-pwa(워크박스)** — manifest + 서비스워커 자동 — _추천_
B) 수동 manifest + SW
C) Other
[Answer]: A

### Q-FU5-4. 푸시 발송 실행 위치 (US-6.7)

A) **collect Edge Function에서 web-push 발송**(triggerPush 실구현, VAPID 서버) — _추천_
B) 별도 Edge Function
C) Other
[Answer]: A

---

## 생성될 산출물

- [x] `construction/U5-pwa-push/functional-design/frontend-components.md`
- [x] `construction/U5-pwa-push/functional-design/business-rules.md`
- [x] `construction/U5-pwa-push/functional-design/business-logic-model.md`
