# U4 공고 상세 — Business Rules

## BR-U4-1. 조회
- `getNoticeDetail(id)`: notices.getById(id) + recommendations(notice_id=id) 단건 조인. 공고 없으면 404(notFound).
- 추천(rec) 없을 수 있음(비추천 공고도 직접 URL 열람 가능) → 점수/자격 섹션은 조건부.

## BR-U4-2. 일정 타임라인 (US-4.2)
- 단계: 모집공고일(notice_date) → 청약시작(apply_start) → 청약마감(apply_end) → 당첨발표(winner_date).
- 값 있는 단계만 표시. today(KST) 기준 지난 단계/현재 단계/예정 구분(색).
- apply_end 기준 D-day 병기.

## BR-U4-3. 자격 판정 표시 (US-6.3, Q-FU4-1=A)
- 저장된 recommendation 사용: eligibleTypes(chips), reasonSummary(문장), score.
- 추가로 notice.eligibility(있으면) 요약: 소득 한도%·총자산 한도·거주요건·청약통장 요건을 사람이 읽을 라인으로.
- rec 없음 → "현재 추천 대상이 아니에요. 프로필을 확인해 보세요" + /settings 링크.

## BR-U4-4. AI 요약 (US-4.3, Q-FU4-2=A)
- notice.eligibility_summary 있으면 표시(수집 단계 생성). 없으면 섹션 생략.
- "AI가 요약한 내용으로 실제 공고 원문 확인을 권장합니다" 주석.

## BR-U4-5. 면적/세대수 (US-4.1, Q-FU4-3=A)
- area_min~max 표시. raw에서 면적별 세대수 추출 가능하면 표, 아니면 범위만(없는 섹션 생략).

## BR-U4-6. 원문 링크 (US-4.4)
- notice.url 있으면 "원문 보기"(target=_blank, rel=noopener). 없으면 버튼 숨김.

## BR-U4-7. 접근성/표시
- 모든 배지 텍스트 병기(NFR-7). 모바일 우선. 빈 섹션은 렌더 생략(깔끔).
