# U3 추천 피드·프로필 UI — Code Generation 계획 (PART 1)

**워크스페이스 루트**: `/Users/baekjaein/git-repo/cheongYak-radar`
**단위**: U3 (추천 피드 `/` + 프로필 `/settings`). **스토리**: US-3.1~3.6 + US-6.1/6.5 UI.
**설계 입력**: U3 frontend-components/business-rules/business-logic-model, infrastructure-design.
**재사용**: `lib/types/notice.ts`·`profile.ts`, `lib/supabase/server.ts`(anon), `/api/profile`(U6), 0005 recommendations.

> 첫 실제 화면 단위 → Tailwind + app 레이아웃 셋업 포함. 순수 로직(피드 필터/포맷)은 vitest 테스트.

---

## 생성 단계 (PART 2)

### Step 1: Tailwind / 앱 셋업
- [x] `tailwind.config.ts`, `postcss.config.js`, `src/app/globals.css`
- [x] `package.json` devDeps 추가(tailwindcss·postcss·autoprefixer)
- [x] `src/app/layout.tsx` — RootLayout(헤더, 하단 네비 피드/설정, globals)

### Step 2: 추천 피드 read 모델
- [x] `src/features/recommendations/repository.ts` — `getRecommendationFeed(filter, page)`: recommendations(score desc)+notices 조회, kind/hideExpired, cursor(score,notice_id)
- [x] `src/features/recommendations/feed-filter.ts` (순수) — searchParams ↔ FeedFilter 변환, kind→sources 매핑 (테스트 대상)

### Step 3: 피드 UI 컴포넌트
- [x] `src/features/feed/badges.tsx` — TypeBadge/NewBadge/NewlywedTag (C13, 텍스트 병기)
- [x] `src/features/feed/DdayBadge.tsx` (C14, 순수 dday 계산 분리)
- [x] `src/features/feed/dday.ts` (순수) — `ddayLabel(applyEnd, today)` (테스트 대상)
- [x] `src/features/feed/EligibilityBadge.tsx` (C31) · `MatchReason.tsx` (C32)
- [x] `src/features/feed/RecommendationCard.tsx` (C12) · `RecommendationFeed.tsx` (C30)
- [x] `src/features/feed/FeedFilterBar.tsx` (client, C15 축소)

### Step 4: 페이지
- [x] `src/app/page.tsx` — FeedPage(RSC, dynamic no-store): 필터 파싱→getRecommendationFeed→피드/빈상태
- [x] `src/app/settings/page.tsx` — RSC shell + ProfileForm

### Step 5: 프로필 폼
- [x] `src/features/profile/ProfileForm.tsx` (client) — GET/PUT /api/profile, 단일 폼, 검증, 저장 토스트

### Step 6: 단위 테스트 (순수)
- [x] `src/features/recommendations/__tests__/feed-filter.test.ts`
- [x] `src/features/feed/__tests__/dday.test.ts`

### Step 7: 빌드 확인 + 문서
- [x] `npm run typecheck` 통과 확인(+필요 시 next build smoke)
- [x] `aidlc-docs/construction/U3-feed-ui/code/U3-code-summary.md`

---

## 스토리 추적
| Story | 구현 |
|---|---|
| US-3.1 NEW 배지 | badges(NewBadge), feed 정렬 |
| US-3.2 유형/신혼 배지 | badges |
| US-3.3 D-day/마감숨김 | DdayBadge/dday.ts, feed-filter hideExpired |
| US-3.4/3.6 필터 | FeedFilterBar + feed-filter |
| US-3.5 더보기 | repository cursor + 피드 |
| US-6.1 프로필 입력 | ProfileForm + /settings |
| US-6.5 추천 피드 | RecommendationFeed/Card + page |

## 총 7단계 · 앱 UI ~15파일 + 테스트 2 + 문서 1. (서버 anon 조회, 프로필 API는 U6 재사용)
