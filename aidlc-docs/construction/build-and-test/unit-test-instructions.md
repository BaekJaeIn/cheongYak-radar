# Unit Test Execution — 청약레이더

## 실행
```bash
npm test            # vitest run (순수 모듈)
npm run typecheck   # tsc --noEmit (전체 타입)
```

## 기대 결과 (2026-06-25 검증)
- **vitest: 99 passed (12 files), 0 failed**
- **tsc: 에러 없음**

## 테스트 커버 영역(순수 로직)
| 파일 | 대상 |
|---|---|
| notices/query-builder.test | 필터/정렬/커서/KST (U2) |
| notices/upserter.test | 합성키·요약 보존 분기 (U2) |
| collect/normalize.test, criteria.test, mock.test | 정규화·자격추출·지역범위·목업 (U1) |
| recommend/matcher.test | 자격 판정(무주택·소득·예비신혼·정보부족) (U6) |
| recommend/scorer.test | 점수·정렬·후보필터 (U6) |
| recommendations/feed-filter.test | 피드 필터 변환 (U3) |
| feed/dday.test | D-day·NEW (U3) |
| detail/timeline.test, criteria-text.test | 일정·자격조건 문장화 (U4) |
| bookmarks/store.test | 북마크 파싱·토글 (U5) |

## 실패 시
1. `npx vitest run` 출력에서 실패 케이스 확인
2. 해당 모듈 수정 → 재실행
3. UI/Edge 런타임 코드는 tsc + next build로 보강 검증
