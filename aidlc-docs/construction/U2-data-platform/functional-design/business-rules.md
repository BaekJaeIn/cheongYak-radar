# U2 데이터 플랫폼 — Business Rules

## BR-1. 식별 & 합성 키 (Q-F1=A)
- BR-1.1 모든 공고의 PK는 `id = "{source}:{source_no}"`. 소스 간 공고번호 충돌을 원천 차단.
- BR-1.2 `source_no`(원본 공고번호)는 표시/원문 매칭용으로 별도 보존.

## BR-2. Upsert 충돌 정책 (Q-F2=A, US-2.1)
- BR-2.1 동일 `id` 재수집 시 `ON CONFLICT (id) DO UPDATE`.
- BR-2.2 **갱신 대상**: title, region_*, area_*, *_date, supply_type, newlywed, pre_newlywed, priority, url, raw, updated_at.
- BR-2.3 **보존(덮어쓰지 않음)**: `created_at`(최초값 유지), `eligibility_summary`(기존 요약 있으면 유지 → Claude 재호출 비용 회피).
  - 예외: 기존 `eligibility_summary`가 NULL이면 갱신 가능.
- BR-2.4 `updated_at`은 매 upsert마다 now로 갱신.

## BR-3. 조회 필터 매핑 (NoticeFilter → 쿼리, US-3.4)
필터는 모두 AND로 결합:
- BR-3.1 `regions`(시군구 목록): 비어있지 않으면 `region_sigu IN (...)`. (시도 단위 "서울 전체"는 region_sido 매칭으로 확장)
- BR-3.2 `areaMin`/`areaMax`: 공고의 면적 범위와 **교집합** 존재 시 매칭 → `area_max >= areaMin AND area_min <= areaMax`(존재하는 경계만).
- BR-3.3 `sources`: 비어있지 않으면 `source IN (...)`.
- BR-3.4 `priorities`: 비어있지 않으면 `priority IN (...)`.
- BR-3.5 `newlywed=true`면 `newlywed = true`. `preNewlywed=true`면 `pre_newlywed = true`.
- BR-3.6 `hideExpired=true`(기본)면 `apply_end IS NULL OR apply_end >= current_date`.

## BR-4. 정렬 (Q-F4=A, 기본)
- BR-4.1 1차: 신규 우선 — `created_at::date = current_date` 인 행을 상단(NEW).
- BR-4.2 2차: 마감 임박 — `apply_end ASC NULLS LAST`.
- BR-4.3 3차(타이브레이크): `id ASC` (커서 안정성).

## BR-5. 페이지네이션 (Q-F3=A 커서)
- BR-5.1 커서 = 마지막 행의 정렬키 튜플 `(is_new_flag, apply_end, id)` 인코딩.
- BR-5.2 다음 페이지: 커서 이후 행을 `limit`만큼. 기본 limit=20.
- BR-5.3 데이터 변동에도 중복/누락 최소화(안정 정렬키 id 포함).

## BR-6. 접근 제어 (RLS, US-2.3)
- BR-6.1 `notices`: 익명(anon) 롤 `SELECT`만 허용. INSERT/UPDATE/DELETE 거부.
- BR-6.2 수집(쓰기)은 service_role(서버 Edge Function)만 수행.
- BR-6.3 `push_subscriptions`: 익명 `INSERT`(구독 등록) 허용, `SELECT`는 service_role만(발송용). 개인정보 최소.

## BR-7. 데이터 무결성
- BR-7.1 적재 전 불변식 검증(면적/날짜 역전 보정 또는 경고 로그).
- BR-7.2 `source`가 enum 외면 적재 거부(로그).
- BR-7.3 `raw`에 원본 보존(추후 재처리 가능).

## BR-8. 날짜/시간
- BR-8.1 날짜 비교 기준 시간대: **KST(Asia/Seoul)**. `current_date`는 KST 기준.
- BR-8.2 D-day/마감 판정도 KST 자정 기준.
