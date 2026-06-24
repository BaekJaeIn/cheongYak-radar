# U3 추천 피드·프로필 UI — Code Summary

## 생성 파일 (Created)

### Tailwind / 앱 셋업
- `tailwind.config.ts`, `postcss.config.js`, `src/app/globals.css`
- `package.json` — tailwindcss/postcss/autoprefixer devDeps 추가
- `src/app/layout.tsx` — RootLayout(헤더 + 하단 네비 추천/내 프로필)

### 피드 read 모델
- `src/features/recommendations/types.ts` — FeedItem/FeedRec/FeedFilter/FeedResult
- `src/features/recommendations/feed-filter.ts` (순수) — searchParams↔FeedFilter, kind→sources, passesFilter
- `src/features/recommendations/repository.ts` — `getRecommendationFeed` (recommendations score desc ⨝ notices, anon RLS, 보조 필터 + 점진 더보기)

### 피드 UI (`src/features/feed/`)
- `dday.ts` (순수) — daysUntil/ddayLabel/isExpired/isNew
- `badges.tsx` (TypeBadge/NewBadge/NewlywedTag) · `DdayBadge.tsx`
- `EligibilityBadge.tsx` (status를 reasonSummary로 파생) · `MatchReason.tsx` (native details)
- `RecommendationCard.tsx` · `RecommendationFeed.tsx` · `FeedFilterBar.tsx`(client)

### 페이지 / 프로필 폼
- `src/app/page.tsx` — 추천 피드(RSC, force-dynamic, 더보기 링크)
- `src/app/settings/page.tsx` — 프로필 화면
- `src/features/profile/ProfileForm.tsx` (client) — GET/PUT `/api/profile`, 단일 폼

### 테스트
- `src/features/recommendations/__tests__/feed-filter.test.ts`
- `src/features/feed/__tests__/dday.test.ts`

## 스토리 추적
| Story | 상태 | 구현 |
|---|---|---|
| US-3.1 NEW 배지 | ✅ | dday.isNew + NewBadge |
| US-3.2 유형/신혼 배지 | ✅ | badges.tsx (텍스트 병기) |
| US-3.3 D-day/마감숨김 | ✅ | DdayBadge + feed-filter |
| US-3.4/3.6 필터 | ✅ | FeedFilterBar + feed-filter |
| US-3.5 더보기 | ✅ | page limit 점진 + repository |
| US-6.1 프로필 입력 | ✅ | ProfileForm + /settings |
| US-6.5 추천 피드 | ✅ | RecommendationFeed/Card + page |

## 검증
- **vitest**: 88 passed (기존 77 + U3 11: feed-filter·dday).
- **tsc --noEmit**: 에러 없음.
- **next build**: 성공 — `/`(ƒ), `/settings`(ƒ), `/api/profile`(ƒ) 컴파일/라우팅 확인.

## 주의/후속
- 페이지네이션은 점진 더보기(limit 증가) — 개인앱 규모 적합. 대량 시 cursor 전환 가능.
- 자격 status는 recommendations.reason_summary("확인 필요" 포함)로 파생 — 정밀 status 필요 시 0005에 status 컬럼 추가.
- 상세 `/notice/[id]` 링크는 U4에서 구현. PWA 매니페스트/오프라인·Push는 U5.
- ProfileForm은 핵심 필드 위주 — 혼인일/거주 상세 등 보강 필드는 추후 확장.
