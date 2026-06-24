# U6 프로필·자격매칭·추천 — Deployment Architecture

> collect Edge Function 확장 + Next Route Handler + 마이그레이션 0005. 기존 U1/U2 배포 파이프라인 재사용.

---

## 1. 마이그레이션 0005 — recommendations
파일: `supabase/migrations/0005_recommendations.sql`
- `create table recommendations (...)` (infrastructure-design §1.1)
- 인덱스 `idx_recommendations_score`
- RLS enable + `recommendations_anon_read`(anon select)
- `upsert_recommendations(p jsonb)` RPC (security definer, first_recommended_at 보존, was_inserted 반환) + `revoke from anon`
- 탈락 정리: `prune_recommendations(keep text[])` 또는 서비스에서 delete 수행

적용: 기존 마이그레이션 체인(0001~0004) 다음. `supabase db push` / CI 마이그레이션.

---

## 2. 컴퓨트 배포 — collect Edge Function 갱신
디렉터리:
```text
supabase/functions/collect/
  ├─ index.ts                 (recompute 단계 + push 훅 확장)
  ├─ recommend/
  │   ├─ criteria-2026.ts      (CriteriaTable config)
  │   ├─ matcher.ts            (EligibilityMatcher.evaluate, 순수)
  │   ├─ scorer.ts             (RecommendationEngine.rank, 순수)
  │   ├─ profile-repo.ts       (household_profile 읽기/쓰기, service_role)
  │   ├─ recommendations-repo.ts (upsert/prune RPC 호출)
  │   └─ service.ts            (RecommendationService.recompute 오케스트레이션)
  └─ __tests__/                (matcher/scorer vitest)
```
배포: `supabase functions deploy collect` (기존과 동일, 단일 함수 갱신).

---

## 3. Next.js 프로필 API
```text
src/app/api/profile/route.ts   (GET 조회 / PUT 저장, service_role)
src/features/profile/           (ProfileRepository 클라이언트 래퍼, 폼 검증 일부)
```
- 배포: 기존 Next 앱과 함께(Vercel/호스팅). service_role 키는 서버 env.

---

## 4. 트리거 체인 (전체)
```text
pg_cron(07:00 KST) ─pg_net→ collect Edge Function
   └ collectAll → upsertNotices → summarizeMissing
              → RecommendationService.recompute
                   ├ ProfileRepository.get (없으면 skip)
                   ├ criteria-2026 로드
                   ├ EligibilityMatcher.evaluate (공고별, allSettled 격리)
                   ├ RecommendationEngine.rank
                   ├ upsert_recommendations → newIds(was_inserted)
                   └ prune_recommendations
              → triggerPush(newIds)  → U5 PushDispatcher(미구현 no-op)

프로필 변경: ProfileForm → /api/profile PUT → save → recompute 트리거(US-6.2)
```

---

## 5. 환경변수 (추가 없음 / 재사용)
| 변수 | 위치 | 비고 |
|---|---|---|
| SUPABASE_URL | Edge·Next 서버 | 기존 |
| SUPABASE_SERVICE_ROLE_KEY | Edge·Next 서버(전용) | 기존, 클라 미노출 |
| ANTHROPIC_API_KEY | Edge | 선택(사유 보강), 기존 |
| COLLECT_MODE | Edge | mock/live, 기존 |

---

## 6. 롤아웃 순서
1. 마이그레이션 0005 적용(recommendations + RPC).
2. criteria-2026.ts 작성(샘플/구조; 수치는 확정 후 보완).
3. collect Edge Function recompute 통합 배포.
4. /api/profile + ProfileForm(UI는 U3/U4) — 프로필 입력 가능해지면 첫 recompute 동작.
5. (U5) PushDispatcher 연결 시 신규추천 알림 활성화.

> 단일 가구·개인 사용 전제로 스케일/멀티테넌시 비요구(C-7). 비용 보호는 Claude 사유 보강 상한(U1 패턴 재사용)으로 충분.
