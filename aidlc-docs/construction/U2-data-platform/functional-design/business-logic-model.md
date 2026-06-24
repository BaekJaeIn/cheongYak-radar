# U2 데이터 플랫폼 — Business Logic Model

> 기술 비종속 로직 흐름. 실제 SQL/Supabase 매핑은 Infrastructure Design.

## C5. NoticeUpserter

### upsertMany(notices: Notice[]) → { inserted[], updated[] }
```
입력: 정규화된 Notice 목록 (U1에서 전달)
1. notices 각 항목 검증 (BR-7: 불변식, source enum)
   - 실패 항목은 skip + 로그, 나머지 진행
2. 배치 upsert 실행 (BR-2)
   - ON CONFLICT (id) DO UPDATE
   - SET 갱신컬럼 = EXCLUDED.*  (BR-2.2)
   - created_at = notices.created_at (보존)         (BR-2.3)
   - eligibility_summary = COALESCE(notices.eligibility_summary, EXCLUDED.eligibility_summary)
       → 기존 요약 보존, 기존 NULL일 때만 새 값       (BR-2.3)
   - updated_at = now()
3. 반환: 신규 삽입된 id[] (inserted) / 갱신된 id[] (updated)
   - inserted = U5 push 트리거 대상(newIds)
```
**에러 정책**: 개별 항목 실패가 전체 배치를 막지 않도록 검증 단계에서 격리. DB 레벨 실패는 상위(CollectionService)로 전파(로그 후 비차단).

## C8. NoticeRepository (조회)

### list(filter: NoticeFilter, page) → { items, nextCursor? }
```
1. 기본 필터 조건 구성 (BR-3) — 모든 절 AND
2. 정렬 적용 (BR-4): [is_new desc, apply_end asc nulls last, id asc]
3. 커서 적용 (BR-5): cursor 있으면 그 이후 행
4. limit+1 조회 → 다음 페이지 존재 여부 판단
5. items(limit개) + nextCursor(있으면) 반환
```

### getById(id) → Notice | null
```
1. PK(id="source:no") 단건 조회
2. RLS(anon select) 통과
3. 없으면 null
```

## 인덱스 요구 (Infrastructure Design 입력)
| 목적 | 컬럼 | 근거 |
|---|---|---|
| 지역 필터 | region_sigu, region_sido | BR-3.1 |
| 유형 필터 | source | BR-3.3 |
| 면적 필터 | area_min, area_max | BR-3.2 |
| 마감/정렬 | apply_end | BR-3.6, BR-4.2 |
| 신혼 필터 | newlywed | BR-3.5 |
| 정렬/신규 | created_at | BR-4.1 |
> 복합 인덱스 후보: `(apply_end, id)` (커서 정렬), `(region_sigu, apply_end)` (대표 조회 패턴). 최종 선정은 Infra Design.

## 데이터 흐름 요약
```
U1 정규화 Notice[] ──> C5.upsertMany ──> [notices] ──(newIds)──> U5 push
                                            │
        U3/U4 화면 ──> C8.list/getById ─────┘ (anon, RLS select)
```

## 처리 시나리오
- **신규 공고**: id 없음 → insert, created_at=now, inserted에 포함 → push 대상.
- **기존 공고 갱신**: 마감일 변경 등 → update, 요약 보존, push 대상 아님.
- **요약 최초 생성**: U1이 summary 채워 upsert → 기존 NULL이므로 저장.
- **마감 공고 조회**: hideExpired=true면 목록 제외, 북마크 화면(U5)에선 흐림 표시(클라).
