# U3 추천 피드·프로필 UI — Business Logic Model

> 화면 데이터 흐름(기술 비종속). 실제 컴포넌트/Tailwind는 Code Generation.

## 데이터 소스
- **추천 피드**: `recommendations`(score, eligible_types, reason_summary) ⨝ `notices`(표시 필드). anon RLS read (둘 다 anon select 허용). (Q-FU3-1=A)
- **프로필**: `/api/profile`(GET/PUT, service_role 서버). 클라는 API만.

## 피드 조회 (서버, U3 소유 read 모델)
```
getRecommendationFeed(filter): FeedItem[]
  1. recommendations 조회: order score desc
  2. notices 조인(notice_id) — 표시 필드
  3. filter 적용(BR-U3-5): kind(분양/임대), hideExpired(apply_end>=today)
  4. FeedItem[] = { notice, rec } 반환
```
> 구현: U2 NoticeRepository 패턴 재사용 + recommendations 조회 추가(`src/features/recommendations/repository.ts`).

## 화면 흐름
```
[/ FeedPage(RSC)]
  searchParams(kind,hideExpired) → getRecommendationFeed
     → RecommendationFeed(items)
         → RecommendationCard × N (배지·D-day·자격·사유)
  FeedFilterBar(client) --change--> router.replace(?kind&hideExpired) --> 재조회

[/settings ProfileForm(client)]
  mount → GET /api/profile → 폼 초기화
  submit → PUT /api/profile → (서버) saveProfile + recompute 트리거
         → 성공 토스트 "추천 갱신 중"
```

## 자격 상태 산출(표시용)
- 카드 status = eligible_types 기반: U6가 이미 eligible/conditional 유형만 eligible_types에 담음.
- "신청가능"(eligible 유형 존재) / "확인필요"(conditional만). ineligible 공고는 피드에 없음(BR-U3-4).
- 상세 사유(펼침)는 reason_summary + (선택) notice.eligibility 기반 보조 텍스트.

## 상태 관리
- 서버 상태(추천·공고): RSC fetch, 캐시 no-store(최신 추천). 
- 클라 상태: FeedFilterBar(URL), ProfileForm(로컬 폼 상태). localStorage 불필요(프로필은 서버).
  - 단, 마지막 본 필터 등 경량 UX는 추후 localStorage 가능(범위 외).

## 에러/로딩
- 피드 조회 실패 → 빈 상태 + 재시도. 프로필 GET 실패 → 빈 폼.
- PUT 실패 → 폼 에러 메시지(저장 실패), 입력 유지.
