# v9 변경요청 확인 질문 — LH·SH·GH 청약시작일 수집 (캘린더 추가용)

**요청 요약**: LH·SH·GH 공고도 '캘린더에 추가' 시 청약마감일이 아니라 **청약시작일**로 일정을 만들고 싶다.

**현황(원인)**: 버튼은 이미 LH·SH·GH에 노출되지만(2026-10-04 커밋 afea1bb), 세 출처 모두 수집 단계에서 `apply_start`가 채워지지 않아 마감일/공고일로 대체되고 있다. 따라서 **수집기(Edge Function `collect`)에서 청약시작일을 가져오도록** 고쳐야 한다.

**출처별 조사 결과 (2026-10-04 실측)**:

| 출처 | 현재 수집 경로 | 시작일 확보 방법 | 비고 |
|---|---|---|---|
| LH | data.go.kr 공고목록 API (`PAN_NT_ST_DT`·`CLSG_DT`만 제공) | data.go.kr **LH 분양임대공고별 상세정보 API**(15057999) `dsSplScdl.ACP_DTTM`(접수일시) | 같은 인증키로 **별도 활용신청 필요**. 공고 1건당 상세 호출 1회 |
| SH | 서울주거포털 목록 HTML (공고게시일·발표일만) | i-sh.co.kr 공고 상세 본문의 "■ 접수일 … 2026. 10. 6.(화)" 텍스트 파싱 | 텍스트 형식이 공고마다 달라 best-effort. 공고 1건당 상세 요청 1회 |
| GH | odcloud/data.go.kr 데이터셋(`GH_API_URL`) | GH 청약센터 메인 카드의 "신청기간 2026-10-01 ~ 2026-10-01" | 메인 1회 요청으로 전 공고 확보. 단 기존 데이터셋과 공고번호 체계가 달라 매칭 방식 결정 필요 |

각 질문의 [Answer]: 태그 뒤에 선택지 문자를 기입해 주세요.

## Question 1
LH 청약시작일은 어떻게 가져올까요?

A) LH 상세정보 API(15057999)로 접수일시를 가져온다 — data.go.kr에서 해당 API 활용신청을 직접 해주셔야 합니다 (추천: 공식 API, 가장 정확)

B) LH는 이번 범위에서 제외 (지금처럼 청약마감일로 대체)

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
SH 청약시작일은 어떻게 가져올까요?

A) SH 공고 상세 페이지(i-sh.co.kr) 본문에서 "접수일" 항목의 첫 날짜를 파싱한다 — 형식이 달라 못 읽는 공고는 시작일 없음으로 둠 (추천)

B) SH는 이번 범위에서 제외

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3
GH 청약시작일은 어떻게 가져올까요?

A) GH 수집기를 GH 청약센터 메인 페이지 크롤링으로 교체한다 — 신청기간(시작·마감) 확보. 단 공고 ID 체계가 바뀌어 기존 GH 공고 북마크가 끊길 수 있음

B) 기존 수집기는 유지하고, GH 메인 페이지의 신청기간을 공고명으로 매칭해 시작·마감일만 보강한다 (추천: 기존 데이터·북마크 영향 없음, 공고명이 다르면 보강 실패)

C) GH는 이번 범위에서 제외

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4
위 방법으로도 청약시작일을 찾지 못한 공고의 '캘린더에 추가' 버튼은 어떻게 할까요?

A) 지금처럼 청약마감일(없으면 모집공고일)로 대체해 버튼을 유지한다 (추천)

B) 청약시작일이 없으면 버튼을 숨긴다 (원래 v3 동작)

C) Other (please describe after [Answer]: tag below)

[Answer]: B
