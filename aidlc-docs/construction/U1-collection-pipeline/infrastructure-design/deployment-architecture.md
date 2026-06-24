# U1 수집 파이프라인 — Deployment Architecture

## 1. 구성도 (텍스트)
```
[pg_cron 'collect-daily' @ 22:00 UTC (07:00 KST)]
        | pg_net.http_post (Bearer service_role)
        v
[Edge Function: collect (Deno)]
        |  fetch
        +--> data.go.kr API (apt/lh/complex)   [live]
        +--> SH 목록 HTML (deno-dom)            [live]
        +--> mock.ts                            [mock]
        |  normalize → upsert_notices RPC (service_role)
        v
   [Supabase DB: notices]
        |  inserted ids
        +--> summarize (Anthropic, ≤10) → upsert(summary)
        +--> U5 PushDispatcher.dispatchForNew(inserted)
```

## 2. 배포
- `supabase functions deploy collect` (Edge Function 배포).
- Edge secrets 설정: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... DATA_GO_KR_API_KEY=... ANTHROPIC_API_KEY=... COLLECT_MODE=mock`.
- cron/확장 마이그레이션: `supabase/migrations/0003_collect_cron.sql` (pg_cron, pg_net enable + schedule).

## 3. 환경/모드
| 환경 | COLLECT_MODE | 비고 |
|---|---|---|
| Local | mock | `supabase functions serve collect` 로 수동 호출 테스트 |
| Production(초기) | mock | API 키 발급 전 — 목업 적재로 전 기능 시연 |
| Production(키 확보 후) | live | secrets만 변경, 재배포 불필요(런타임 env) |

## 4. 수동 트리거(개발/검증)
```bash
# 로컬
supabase functions serve collect
curl -X POST http://localhost:54321/functions/v1/collect -H "Authorization: Bearer <anon-or-service>"
# 원격
curl -X POST https://YOUR_PROJECT.functions.supabase.co/collect -H "Authorization: Bearer <service_role>"
```

## 5. 회복/관측 (경량)
- 실행 로그: Edge Function 로그(소스별 count/error, inserted/updated, summarized) — BR-10.
- 실패 시: 다음 날 07:00 재실행으로 자연 복구(데이터 원천은 외부, raw 보존).
- 부분 실패(소스 1개)는 격리되어 전체 적재에 영향 없음.

## 6. 단위 연계
- **→ U2**: `upsert_notices` RPC (DDL/권한은 U2 마이그레이션 0001).
- **→ U5**: 신규 id로 push 트리거 (U5에서 PushDispatcher 구현).
- **← U4**: summarize.ts가 U4 요약 사양(모델/프롬프트) 사용.
