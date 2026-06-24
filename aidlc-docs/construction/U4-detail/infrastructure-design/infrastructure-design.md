# U4 공고 상세 — Infrastructure Design

> 새로운 인프라 결정 없음 — U3 패턴 재사용(Next.js App Router + Vercel, RSC no-store, anon RLS read).

## 1. 라우트 / 렌더링
| 라우트 | 타입 | 렌더 |
|---|---|---|
| `/notice/[id]` (app/notice/[id]/page.tsx) | RSC | force-dynamic, no-store. params.id → getNoticeDetail. 없으면 `notFound()`(404) |
| `app/notice/[id]/not-found.tsx` | 정적 | 404 안내 + 피드 링크 |

## 2. 데이터 경로
- anon Supabase(server.ts): `notices.getById` + `recommendations` 단건. RLS anon select(0001/0005). 키 노출 없음.
- AI 요약은 `notices.eligibility_summary`(이미 적재) 읽기만 — U4에서 Claude 호출 없음(Q-FU4-2=A).

## 3. 신규 모듈(코드 생성 대상)
- `src/app/notice/[id]/page.tsx`, `not-found.tsx`
- `src/features/recommendations/repository.ts` — `getRecommendationFor(id)` 추가
- `src/features/notices/detail.ts` — `getNoticeDetail(id)`(notice+rec 결합)
- `src/features/detail/*` — DetailHeader, ScheduleTimeline, EligibilityDetail, AiSummary, AreaInfo, SourceLink + 순수 `timeline.ts`/`criteria-text.ts`

## 4. 캐싱/성능
- no-store(최신 추천/요약). 경량 RSC. 모바일 우선.

## N/A
- 신규 테이블/시크릿/외부 호출 없음. 배포는 U3 deployment-architecture와 동일(Vercel + 동일 env).
