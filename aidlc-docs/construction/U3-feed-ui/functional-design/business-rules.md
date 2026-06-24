# U3 추천 피드·프로필 UI — Business Rules

## BR-U3-1. 피드 정렬·구성 (US-6.5, US-3.1)
- 기본 정렬: recommendations.score 내림차순(서버). 동점 시 apply_end 오름차순.
- `is_new`(created_at=오늘 KST) 공고는 NEW 배지. (점수 정렬 유지, 배지만 강조)
- 추천(recommendations에 존재)만 피드에 노출. 비추천(자격 없음) 공고는 기본 미표시.

## BR-U3-2. 배지 (US-3.2, NFR-7)
- 유형 배지: SOURCE_LABEL(분양/LH임대/SH임대/민간임대). 색 + 텍스트 병기.
- 신혼 태그: notice.newlywed=true → "신혼부부". pre_newlywed=true → "예비신혼".
- 모든 배지는 색상 외 텍스트 라벨 필수(접근성).

## BR-U3-3. D-day·마감 (US-3.3)
- DdayBadge: `apply_end - today(KST)` → D-n. 0일 "오늘마감".
- 마감(apply_end < today): 기본 숨김(hideExpired 기본 true). 토글로 표시 시 흐리게.

## BR-U3-4. 자격 상태 표시 (US-6.3, Q-FU3-3=A)
- recommendations.eligible_types와 MatchResult status 매핑:
  - eligible 유형 존재 → "신청가능"(green).
  - conditional만 → "확인필요"(amber).
  - (ineligible만인 공고는 추천 후보가 아니므로 피드 미노출)
- MatchReason: reason_summary 1줄 기본 + 펼침 시 상세 사유.

## BR-U3-5. 보조 필터 (US-3.4, Q-FU3-4=A)
- 유형 세그먼트: 전체/분양(apt)/임대(lh·sh·private). 마감숨김 토글.
- 필터는 URL searchParams로 서버 전달(RSC 재조회). 정렬 변경 불가(점수순 고정).
- 지역·면적·순위 상세 필터는 v2에서 추천 점수에 반영되므로 UI 필터 생략(간소화).

## BR-U3-6. 프로필 폼 (US-6.1/6.2, Q-FU3-2=A)
- 단일 폼. 저장 전 클라 검증: members≥1, monthlyIncome≥0, residence.since≤today, areaMin≤areaMax.
- 미입력 항목 허용(서버/매칭이 conditional 처리). 저장=PUT /api/profile → 200 시 "저장됨 + 추천 갱신 중" 안내.
- 민감정보는 폼→/api(서버)만. 클라가 service_role/DB 직접 접근 안 함.

## BR-U3-7. 빈 상태
- 프로필 미입력 → 피드에 "프로필을 입력하면 맞춤 추천을 받을 수 있어요" + /settings 링크.
- 추천 0건 → "현재 조건에 맞는 공고가 없어요"(필터 완화 안내).

## BR-U3-8. 성능/PWA
- 피드는 RSC로 초기 렌더(빠른 first paint). 무한스크롤은 추가 페이지 서버 액션/route.
- 모바일 우선 반응형. (PWA 설치/오프라인은 U5)
