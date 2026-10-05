# v9 Code Summary — LH·SH·GH 청약시작일 수집

**변경요청**: v9 (2026-10-05) — requirements.md §17 FR-17 / Q1=A, Q2=A, Q3=A, Q4=B

## 파일
- **Created** `supabase/functions/collect/collectors/parsers.ts` — 순수 파서: `toIsoDate`(FR-17.5), `parseLhSchedule`(dsSplScdl.ACP_DTTM 최소 시작일·PZWR_ANC_DT), `htmlToText`, `parseShList`(주석 제거 후 셀 위치 파싱, i-sh.co.kr 링크만), `parseShApplyPeriod`(접수 키워드 뒤 160자 첫 날짜/범위), `parseGhCards`(신청기간·상가 제외·중복 제거), `ghNetFunnelActive`, `ghDetailUrl`.
- **Created** `supabase/functions/collect/__tests__/parsers.test.ts` — 14 tests (실사이트 구조 기반 픽스처).
- **Modified** `collectors/lh.ts` — 후보 수집 후 상세정보 API(`lhLeaseNoticeDtlInfo1/getLeaseNoticeDtlInfo1`, env `LH_DETAIL_API_URL`로 override 가능) 동시성 4로 호출 → `apply_start`·`winner_date` 보강. 목록 날짜 ISO 정규화. 상세 실패는 공고 단위 warn+skip.
- **Rewritten** `collectors/sh.ts` — deno-dom 제거, 정규식 파싱. 임대 '모집중'·분양 게시 90일 이내. 상세 동시성 3. 주소는 "서울특별시" 고정(공고명 단지명이 시군구로 오파싱되는 문제 회피).
- **Rewritten** `collectors/gh.ts` — `GH_API_URL` odcloud 의존 제거, GH 청약센터 메인 카드 크롤링. NetFunnel 활성 시 skip. 주소 "경기도 {공고명}"으로 시군 파싱.
- **Modified** `index.ts` — `ShCollector` 재활성, 주석 갱신.
- **Modified** `src/features/detail/calendar-link.ts`·`ScheduleTimeline.tsx`·테스트 — apply_start 전용 복귀(FR-17.4, afea1bb 대체 로직 철회). `compact`는 구분자 무관 처리 유지.

## 검증
- vitest 181 passed (parsers +14, calendar 재작성), tsc clean, `deno check` (collectors 4 파일) OK.
- 로컬 Deno 2.9.7 실사이트 드라이런(2026-10-05): SH 7건 중 6건 시작일, GH 12건 중 9건 시작일(미추출 3건은 사이트 카드의 신청기간 공란).
- LH 상세 API는 인증키가 서버 시크릿에만 있어 배포 후 수집 로그(`[lh] … 접수시작일 보강 N건`)로 확인.

## 운영 메모
- 기존 GH 행(odcloud id 체계)은 갱신되지 않고 잔존 — 마감일 경과 시 피드 제외. `GH_API_URL` 시크릿은 더 이상 사용하지 않음.
- SH 시작일 미추출 공고는 apply_end도 null → 피드 만료 필터에 걸리지 않음(기존 SH 정책과 동일).
- 배포: `supabase functions deploy collect` + git push(Vercel).
