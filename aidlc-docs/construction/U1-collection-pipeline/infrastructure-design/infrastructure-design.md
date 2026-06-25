# U1 수집 파이프라인 — Infrastructure Design

> 결정: pg_cron + pg_net(Q-IU1=A), deno-dom(Q-IU2=A), 요약 상한 10/회(Q-IU3=A).

## 1. 서비스 매핑
| 논리 요소 | 인프라 |
|---|---|
| S1 CollectionService 진입점 | Supabase Edge Function `collect` (Deno) |
| 정기 실행 | pg_cron 작업 → pg_net으로 Edge Function HTTP 호출 |
| DB 쓰기 | service_role 키로 `upsert_notices` RPC (U2) |
| 외부 수집 | HTTPS fetch (data.go.kr API) / SH HTML fetch |
| HTML 파싱 | `deno-dom` (Deno 네이티브) |
| 요약 | Anthropic API (claude-opus-4-8), 1회 상한 10건 |
| 시크릿 | Edge Function secrets (service_role, data.go.kr, anthropic) |

## 2. Edge Function 구성
```
supabase/functions/collect/
  index.ts                 # 진입점: run() — 모드결정→수집→upsert→요약→push→로깅
  collectors/
    apply-home.ts          # source=apt
    lh.ts                  # source=lh
    myhome-complex.ts      # 보강
    sh.ts                  # source=sh (deno-dom 파싱)
    types.ts               # Collector 인터페이스
  normalize.ts             # parseRegion/parseArea/inferNewlywed/mapPriority (BR-2~5)
  mock.ts                  # MockDataProvider (BR-7)
  summarize.ts             # EligibilitySummarizer 호출 (상한 10)
  upsert.ts                # upsert_notices RPC 호출 (U2 계약 재사용)
  region-alias.ts          # 생활권명→행정구역 별칭표 (평촌→안양시 등)
```
> 비고: Edge Function은 Deno 런타임 → `src/`의 Node 코드와 분리. U2 upsert 로직은 동일 RPC를 호출해 계약만 공유(코드 직접 import 아님).

## 3. 스케줄 (pg_cron + pg_net) — 매일 07:00 KST = 22:00 UTC(전일)
```sql
-- 마이그레이션(U1): cron 등록. service_role 키는 Vault 또는 설정에서 주입.
select cron.schedule(
  'collect-daily',
  '0 22 * * *',          -- 22:00 UTC = 07:00 KST
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT.functions.supabase.co/collect',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
```
> 확장 필요: `pg_cron`, `pg_net` (Supabase 대시보드/마이그레이션에서 enable).
> KST 고정 오프셋(서머타임 없음) → 22:00 UTC 고정 안전.

## 4. 외부 호출
- **data.go.kr API**: HTTPS GET, `DATA_GO_KR_API_KEY` 쿼리/헤더. live 모드에서만.
- **SH 크롤링**: 목록 페이지 fetch → `deno-dom`으로 셀렉터 파싱(셀렉터는 sh.ts 상수). 항목 실패 skip(BR-6.3).
- **Gemini**: REST fetch(generativelanguage API), `GEMINI_API_KEY`, 모델 `gemini-2.0-flash`.

## 5. 시크릿 (NFR-3) — Edge Function secrets
| 키 | 용도 |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | upsert_notices RPC |
| `SUPABASE_URL` | RPC 엔드포인트 |
| `DATA_GO_KR_API_KEY` | 공공 API(live) |
| `GEMINI_API_KEY` | 요약 |
| `COLLECT_MODE` | mock/live 토글 |
> 모두 서버(Edge) 전용. 클라이언트 노출 금지.

## 6. 멱등성·안전
- upsert는 멱등(공고번호 합성키). 재실행/중복 트리거 안전.
- 요약 상한 10 → 비용 폭주 방지, 누락분 다음 실행 이월.
- 함수 타임아웃 내 완료(소스별 타임아웃 설정).

## N/A
- 로드밸런서/오토스케일/큐 — 단일 함수·저빈도(일 1회)로 불필요.
