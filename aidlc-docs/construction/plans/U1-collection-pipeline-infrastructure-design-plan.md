# U1 수집 파이프라인 — Infrastructure Design 계획

**입력**: U1 functional-design, U2 infra(notices/RPC). 전제: Supabase Edge Function(Deno) + cron (Q4=A).

아래 **질문(Q-IU1 ~ Q-IU3)** 의 `[Answer]:` 태그에 보기를 적고, 완료되면 "완료"라고 알려주세요.

---

## 생성될 산출물
- [x] `construction/U1-collection-pipeline/infrastructure-design/infrastructure-design.md` — Edge Function·스케줄·시크릿·외부 호출
- [x] `construction/U1-collection-pipeline/infrastructure-design/deployment-architecture.md` — 배포·cron·환경

---

## 결정이 필요한 질문

### Q-IU1. cron 트리거 방식 (매일 07:00 KST)
Edge Function을 어떻게 정기 실행할까요?

A) **pg_cron + pg_net** — DB cron이 Edge Function URL을 HTTP 호출(서버리스 표준 패턴, service_role 시크릿 사용) — *추천*

B) **Supabase 대시보드 Scheduled Functions** — UI에서 스케줄(가용 시)

C) **GitHub Actions 스케줄** — 외부에서 Edge Function 호출(이중화는 향후)

D) Other (please describe after [Answer]: tag below)

[Answer]: 

---

### Q-IU2. Deno 환경 HTML 파서 (SH 크롤링)
Edge Function(Deno)에서 SH HTML을 어떤 라이브러리로 파싱할까요?

A) **deno-dom** — Deno 네이티브 DOM 파서(Edge Function 친화) — *추천*

B) **cheerio (npm:)** — Node 친숙, Deno에서 npm: 임포트

C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

### Q-IU3. 요약 1회 실행 상한 (BR-8.3 비용 보호)
한 번 수집 실행에서 Claude 요약을 최대 몇 건까지 만들까요?

A) **10건** — Free tier·비용 보수적, 나머지는 다음 실행 이월 — *추천*

B) **무제한** — 누락분 전부(초기 적재 빠름, 비용↑)

C) Other (please describe after [Answer]: tag below)

[Answer]: 
