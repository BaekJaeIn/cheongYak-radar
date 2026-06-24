# Integration Test Instructions — 청약레이더

## 목적
단위 간 상호작용 검증: 수집(U1) → DB(U2) → 추천(U6) → UI(U3/U4) → 알림(U5).

## 환경 준비
```bash
supabase start && supabase db reset      # 0001~0005 + seed
supabase functions serve collect          # Edge
npm run dev                               # Next (별 터미널)
# .env.local: COLLECT_MODE=mock, NEXT_PUBLIC_SUPABASE_*, VAPID_*
```

## 시나리오

### S1. 수집 → DB upsert (U1→U2)
- 실행: `curl -X POST localhost:54321/functions/v1/collect`
- 기대: `notices`에 목업 ~16건 upsert, 서울·경기 외 드롭(C-6), `eligibility` 일부 채움. 응답 `{inserted, recommend:{...}}`.

### S2. 프로필 저장 → 추천 재계산 (U3→U6)
- `/settings`에서 프로필 입력·저장 → `PUT /api/profile` 200.
- 기대: collect `{action:"recompute"}` 트리거 → `recommendations` 갱신. `/`에 점수순 추천 노출.

### S3. 자격 판정·점수 정합 (U6)
- 무주택=false → 추천 0(전부 ineligible). 관심지역(안양/군포) 공고가 상단. 예비신혼+신혼특공 → "혼인신고 후 신청" 사유.

### S4. 상세 표시 (U4)
- 피드 카드 → `/notice/[id]`: 타임라인·자격(eligibleTypes·사유)·AI요약(있으면)·원문. 없는 id → 404.

### S5. 북마크 (U5)
- 카드/상세 ★ 토글 → `/bookmarks`에 노출(마감 임박 정렬, 만료 흐림). localStorage 유지.

### S6. 알림 구독·발송 (U5, US-6.7)
- NotifyToggle 허용 → `/api/subscribe` → `push_subscriptions` INSERT.
- 새 추천 발생(collect 재실행, 신규 noticeId) → web-push 발송 → 기기 알림. 만료 구독 410 정리.

## 정리
```bash
supabase stop
```

## 비고
- 실데이터(live)는 data.go.kr 키 + `COLLECT_MODE=live` 필요. 키 확보 전 mock으로 전 흐름 검증 가능.
