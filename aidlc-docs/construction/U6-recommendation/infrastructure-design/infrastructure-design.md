# U6 프로필·자격매칭·추천 — Infrastructure Design

> 결정: Q-IU6-1=A(recommendations anon read + service write), Q-IU6-2=A(collect Edge Function에 recompute 통합), Q-IU6-3=A(criteria TS 모듈), Q-IU6-4=A(Next Route Handler + service_role). 플랫폼: Supabase(Postgres + Edge Functions) + Next.js 14. 기존 U1/U2 인프라 재사용.

---

## 1. 데이터 저장 (Postgres) — 마이그레이션 0005

### 1.1 `recommendations` 테이블 (Q-IU6-1=A)
precompute 결과 영속화(Q-FU6-1=A). 단일 가구이므로 noticeId 단독 PK.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| notice_id | text PK → notices(id) ON DELETE CASCADE | 공고 1:1 |
| score | numeric not null | 0~100 |
| eligible_types | text[] not null default '{}' | eligible/conditional 유형 |
| reason_summary | text | 규칙 템플릿(+선택 Claude) |
| score_breakdown | jsonb | 요인별 기여 |
| first_recommended_at | timestamptz not null default now() | 신규추천 diff 기준(보존) |
| computed_at | timestamptz not null default now() | 매 계산 갱신 |

**인덱스**: `idx_recommendations_score (score desc)` — 피드 정렬.
**RLS**: `enable row level security` + `recommendations_anon_read`(select to anon using true). INSERT/UPDATE/DELETE 정책 없음 → service_role만 쓰기(notices 0001 패턴 동일, BR-U6-17).

### 1.2 영속화 RPC — `upsert_recommendations(p jsonb)` + 정리
- service_role/Edge Function 호출. `jsonb_to_recordset` upsert.
- `on conflict (notice_id)`: score·eligible_types·reason_summary·score_breakdown·computed_at 갱신, **first_recommended_at 보존**(coalesce 기존).
- 반환: `notice_id, was_inserted` — was_inserted=true가 **신규추천**(BR-U6-15) → Push 대상.
- `prune_recommendations(keep_ids text[])` 또는 upsert 후 `delete where notice_id <> all(keep_ids)` — 탈락 정리(BR-U6-14).
- `revoke all ... from anon`.

### 1.3 `household_profile` (이미 0004)
- 단일행(id=1), RLS anon 차단. `upsert_household_profile` RPC. 변경 불필요.

---

## 2. 컴퓨트 — 재계산 실행 환경 (Q-IU6-2=A)

### 2.1 collect Edge Function 확장
기존 `supabase/functions/collect/index.ts` 흐름에 recompute 단계 삽입:
```text
collectAll → upsertNotices → summarizeMissing
           → RecommendationService.recompute(client)   ← 신규
           → newRecommendationIds → triggerPush(U5)      ← 기존 훅 확장
```
- 매칭·점수 로직(C26/C27)은 **순수 모듈**(Deno/Node 공통) → Edge Function에서 import. vitest 단위 테스트 가능.
- 재계산은 service_role 클라이언트 사용(프로필·notices 읽기, recommendations 쓰기).
- 프로필 미입력 시 recompute no-op(로그) → 수집은 정상 완료.

### 2.2 순수 엔진 모듈 배치 (공유)
자격매칭·점수는 Edge Function(Deno)과 Next 서버(Node) 양쪽에서 쓰일 수 있어 **소스 공유**가 이상적이나, U1 선례대로 런타임 자기완결성을 위해 Edge 쪽에 배치하고 타입은 미러:
- `supabase/functions/collect/recommend/` (matcher.ts, scorer.ts, criteria.ts[config], service.ts) — Edge 런타임 소유.
- on-demand 재계산(프로필 변경)은 Next Route Handler가 collect Edge Function의 `recompute` 액션을 호출(또는 profile 저장 후 동일 함수 트리거)하여 로직 중복 방지.

---

## 3. criteria 기준표 config (Q-IU6-3=A)
- `supabase/functions/collect/recommend/criteria-2026.ts` — `CriteriaTable` TS 상수 export(연도별). 엔진이 import.
- 연도 전환 시 새 파일 추가 + 로더가 현재 연도 선택. 상세 수치는 작성 시 확정(A-2, 로컬 household-profile 참조).

---

## 4. 프로필 접근 경로 (Q-IU6-4=A)
- **Next.js Route Handler**: `app/api/profile/route.ts` (GET/PUT) — 서버에서 service_role 클라이언트로 `household_profile` 조회/`upsert_household_profile` 호출. 클라(ProfileForm)는 이 API만 호출, 프로필 원본은 브라우저↔DB 직접 노출 없음.
- 저장 성공 시 재계산 트리거(collect Edge Function recompute 호출 또는 큐) → US-6.2.
- service_role 키는 **서버 전용 env**(`SUPABASE_SERVICE_ROLE_KEY`), 클라 번들 미포함.

---

## 5. 외부 연동 · 시크릿 (재사용)
| 시크릿 | 용도 | 비고 |
|---|---|---|
| SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY | Edge·Next 서버 DB 접근 | 기존 |
| GEMINI_API_KEY | 추천 사유 Gemini 보강(선택, BR-U6-12) | U1 summarize와 공유, 상한·비차단 동일 패턴 |

---

## 6. Push 연계 (U5, 미구현)
- recompute가 반환한 `newRecommendationIds` → `triggerPush(client, newIds)`(U1 index.ts 기존 훅) → U5 PushDispatcher가 실제 발송(US-6.7). U5 구현 전까지 no-op 로그.

---

## 7. 모니터링/로깅
- recompute 결과 `{ recommended, newRecommendations, skipped }`를 collect 결과 JSON에 포함(BR-10 로깅 패턴 확장). 콘솔 로그 → Supabase Functions 로그.
