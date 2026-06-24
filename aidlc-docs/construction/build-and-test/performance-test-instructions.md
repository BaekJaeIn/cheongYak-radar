# Performance Test Instructions — 청약레이더

> 개인용·단일 가구·Free tier 대상 — 대규모 부하 테스트는 N/A. 경량 확인만.

## 목표(경량)
- 추천 피드(`/`) 응답: 체감 1초 이내(NFR-1). 데이터 수천 건 내.
- 재계산(recompute): 공고 수백~수천 × 단일 프로필 → cron(일 1회) 내 완료.

## 확인 방법
- 피드 쿼리: `recommendations`(score desc, idx_recommendations_score) + notices 조인. EXPLAIN로 인덱스 사용 확인.
- 수집/재계산 시간: collect 응답 로그(`recommend.recommended`, 소요) 관찰.

## 인덱스 점검
```sql
explain analyze select * from recommendations order by score desc limit 20;
-- idx_recommendations_score 사용 확인
```

## 최적화 여지(필요 시)
- 피드 조회 캐핑(FETCH_CAP=500) → 데이터 증가 시 서버 키셋 페이지네이션 전환.
- 매칭 N건 증가 시 recompute 배치/증분(영향 공고만) 고려.

## 상태
- 현 규모(개인앱)에서 성능 이슈 없음 예상. 정량 부하 테스트는 불필요(N/A).
