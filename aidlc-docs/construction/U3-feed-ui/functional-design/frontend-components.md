# U3 추천 피드·프로필 UI — Frontend Components

> Next.js 14 App Router + Tailwind. 결정: RSC 조인 조회(A), 단일 스크롤 프로필 폼(A), 3색 자격 배지(A), 간단 보조 필터(A).
> data-testid 부여(자동화 친화). 모바일 우선.

## 화면(라우트)
| 라우트 | 화면 | 스토리 |
|---|---|---|
| `/` | 추천 피드(점수순) | US-6.5, US-3.1~3.5 |
| `/settings` | 가구 프로필 입력 | US-6.1, US-3.6 |
| (`/notice/[id]` 는 U4) | | |

## 컴포넌트 계층
```
app/layout.tsx (RootLayout: 헤더/네비/PWA meta)
app/page.tsx (RSC: FeedPage)
  └ RecommendationFeed (C30, server)
      ├ FeedFilterBar (client: 유형·마감숨김 토글) [Q-FU3-4 보조]
      └ RecommendationCard[] (C12 확장)
          ├ TypeBadge / NewBadge / NewlywedTag (C13)
          ├ DdayBadge (C14)
          ├ EligibilityBadge (C31: 신청가능/확인필요/불가)
          └ MatchReason (C32: 사유 펼침)
app/settings/page.tsx (RSC shell)
  └ ProfileForm (C29, client: 단일 스크롤 폼)
```

## 컴포넌트 정의

### FeedPage (app/page.tsx) — RSC
- **데이터(Q-FU3-1=A)**: 서버에서 `getRecommendationFeed(filter)` 호출 → recommendations(score desc) ⨝ notices.
- props: `searchParams`(유형·마감숨김). 빈 추천 시 "프로필을 입력하세요/추천 없음" 안내.

### RecommendationFeed (C30)
- props: `items: FeedItem[]` (notice + recommendation 병합), `filter`.
- US-3.1 NEW 강조: `is_new`(created_at=오늘) 상단/배지. 점수순 정렬은 서버.

### RecommendationCard (C12)
- props: `item: FeedItem`.
- 표시: 제목, 지역(region_sigu), TypeBadge, NewlywedTag, NewBadge, DdayBadge, **score(추천도)**, EligibilityBadge, MatchReason 펼침, 원문/상세 링크.
- `data-testid="rec-card-{noticeId}"`.

### EligibilityBadge (C31) — Q-FU3-3=A
- props: `status: 'eligible'|'conditional'|'ineligible'`, `types: string[]`.
- 3색 + 텍스트: 신청가능(green)/확인필요(amber)/불가(gray). 색 외 라벨 병기(NFR-7). `data-testid="elig-badge"`.

### MatchReason (C32)
- props: `reasonSummary: string`, `reasons?: string[]`.
- 기본 요약 1줄 + "사유 보기" 펼침. `data-testid="match-reason"`.

### TypeBadge/NewBadge/NewlywedTag (C13), DdayBadge (C14)
- 기존 U3 정의 유지. SOURCE_LABEL(notice.ts) 사용. DdayBadge: apply_end→D-n, 마감 표시.

### FeedFilterBar (C15 축소, Q-FU3-4=A)
- props: `value:{ kind?: 'sale'|'rent', hideExpired: boolean }`, `onChange`.
- 유형(분양/임대) 세그먼트 + 마감숨김 토글. 변경 시 URL searchParams 갱신(서버 재조회). 정렬은 점수순 고정.
- `data-testid="feed-filter-{control}"`.

### ProfileForm (C29) — Q-FU3-2=A
- 단일 스크롤 폼, 섹션: 혼인/세대 · 소득 · 자산 · 거주 · 청약통장(본인/여친) · 희망조건.
- 초기값: `GET /api/profile`. 저장: `PUT /api/profile`(→ recompute 트리거, US-6.2).
- 검증: members≥1, since≤today, areaMin≤areaMax. 누락 허용(BR-U6-7).
- `data-testid="profile-form"`, 각 필드 `profile-{field}`.

## 공유 타입
- `FeedItem = { notice: Notice; rec: { score, eligibleTypes, reasonSummary, scoreBreakdown } }`
- `FeedFilter = { kind?: 'sale'|'rent'; hideExpired: boolean }`

## 상호작용 흐름
- 진입 `/` → 서버 추천 조회 → 카드 렌더(점수순) → 필터 변경=searchParams→재조회.
- `/settings` 저장 → PUT → recompute → `/` 새로고침 시 갱신 반영.
