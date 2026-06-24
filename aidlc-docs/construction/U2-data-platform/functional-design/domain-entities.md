# U2 데이터 플랫폼 — Domain Entities

> 기술 비종속 도메인 모델. 실제 SQL/인프라는 Infrastructure Design에서.
> 결정: 합성 키 `source:공고번호`(Q-F1=A), 요약 보존(Q-F2=A), 커서 페이지네이션(Q-F3=A), 신규 우선 정렬(Q-F4=A).

## Entity: Notice (공고)

| 필드 | 타입 | 설명 | 제약 |
|---|---|---|---|
| id | string | **합성 키** `"{source}:{공고번호}"` | PK, not null |
| source_no | string | 원본 공고번호 | not null |
| source | enum | `apt`\|`lh`\|`sh`\|`private` | not null |
| title | string | 공고명/주택명 | not null |
| region_sido | string? | 시도(경기/서울) | 인덱스 |
| region_sigu | string? | 시군구(안양시/군포시) | 인덱스 |
| area_min | number? | 최소 전용면적(㎡) | 인덱스 |
| area_max | number? | 최대 전용면적(㎡) | |
| notice_date | date? | 모집공고일 | |
| apply_start | date? | 청약 시작일 | |
| apply_end | date? | 청약 마감일 | 인덱스(정렬/마감숨김) |
| winner_date | date? | 당첨자발표일 | |
| supply_type | string? | 일반/신혼부부/특별공급 | |
| newlywed | boolean | 신혼부부 특공 여부 | default false, 인덱스 |
| pre_newlywed | boolean | 예비신혼부부 허용 | default false |
| priority | enum? | `1순위`\|`2순위`\|`무순위` | |
| url | string? | 원문 링크 | |
| eligibility_summary | string? | Claude 자격요약(캐시) | nullable |
| raw | json | API 원본 | |
| created_at | timestamptz | 최초 적재 | default now |
| updated_at | timestamptz | 최종 갱신 | default now |

**불변식(Invariants)**
- `id == source + ":" + source_no`
- `area_min <= area_max` (둘 다 존재 시)
- `apply_start <= apply_end` (둘 다 존재 시)
- `source`는 4개 enum 중 하나

**파생 속성(저장 안 함, 조회/표시 계산)**
- `is_new`: `created_at`가 오늘 → NEW 배지 (US-3.1)
- `dday`: `apply_end - today` → D-day (US-3.3)
- `is_expired`: `apply_end < today` → 마감(숨김/흐림)

## Entity: PushSubscription (알림 구독)

| 필드 | 타입 | 설명 | 제약 |
|---|---|---|---|
| id | uuid | PK | default gen |
| endpoint | string | 푸시 엔드포인트 | unique, not null |
| p256dh | string | 공개키 | not null |
| auth | string | 인증 시크릿 | not null |
| device_id | string? | 비로그인 기기 식별 | |
| created_at | timestamptz | | default now |

**불변식**: `endpoint` 유니크(중복 구독 방지).

## 관계
- Notice ↔ PushSubscription: 직접 FK 없음. 발송 시 newIds(Notice.id 목록) × 전체 subscriptions로 fan-out.
- bookmarks: **DB 엔티티 아님** — 클라이언트 localStorage 보관(Q3=A). U2 범위 외.

## Enum 정의
- `SourceType`: apt | lh | sh | private
- `Priority`: 1순위 | 2순위 | 무순위
