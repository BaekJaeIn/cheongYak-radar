# v9 Code Generation Plan — LH·SH·GH 청약시작일 수집

**변경요청**: v9 (2026-10-05) — requirements.md §17 FR-17 / Q1=A, Q2=A, Q3=A, Q4=B
**대상 단위**: U1 수집 파이프라인(Edge `collect`) + U4 상세(캘린더)

## Steps
- [x] Step 1: 순수 파서 모듈 `supabase/functions/collect/collectors/parsers.ts` — 날짜 정규화(toIsoDate), LH `ACP_DTTM`/`PZWR_ANC_DT` 파싱, HTML→텍스트, SH 목록 행·상세 접수일 파싱, GH 메인 카드 파싱 (FR-17.1~17.3, 17.5)
- [x] Step 2: 파서 단위 테스트 `supabase/functions/collect/__tests__/parsers.test.ts`
- [x] Step 3: `collectors/lh.ts` — 필터 통과 공고마다 상세정보 API 호출(저동시성) → apply_start·winner_date 보강, 목록 날짜 ISO 정규화. 실패는 공고 단위 skip (FR-17.1)
- [x] Step 4: `collectors/sh.ts` 재작성 — 정규식 기반 목록 파싱(임대 모집중·분양 90일), i-sh 상세 본문 접수일 추출 (FR-17.2)
- [x] Step 5: `collectors/gh.ts` 교체 — GH 메인 카드 크롤링, 상가 제외, NetFunnel skip, bizTyCd별 상세 링크 (FR-17.3)
- [x] Step 6: `index.ts` — SH 수집기 재활성, 주석 갱신
- [x] Step 7: U4 캘린더 — `calendar-link.ts`·`ScheduleTimeline.tsx`·테스트를 apply_start 전용으로 복귀 (FR-17.4)
- [x] Step 8: 코드 요약 `aidlc-docs/construction/U1-collection-pipeline/code/v9-apply-start-code-summary.md`
- [x] Step 9: 검증 — vitest, tsc, `deno check`, 로컬 Deno로 SH·GH 실사이트 수집 드라이런
