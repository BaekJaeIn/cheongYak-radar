# U1 — 소스별 필드 매핑 (잠정)

> API 키 미발급(mock 모드)이라 실 응답 스키마는 잠정. `live` 전환 시 실제 필드명으로 확정 필요.
> 대상: U2 `NoticeInput`.

## 공통 타깃 필드 (NoticeInput)
id · source_no · source · title · region_sido · region_sigu · area_min · area_max · notice_date · apply_start · apply_end · winner_date · supply_type · newlywed · pre_newlywed · priority · url · raw

## 1. 청약홈 분양정보 (source=apt, data.go.kr 15098547)
| 타깃 | 소스 후보 필드(잠정) |
|---|---|
| source_no | 공고번호(PBLANC_NO) |
| title | 주택명(HOUSE_NM) |
| region_sido/sigu | 공급지역명/공급위치(주소) → parseRegion |
| area_* | 주택형/전용면적 → parseArea |
| notice_date | 모집공고일(RCRIT_PBLANC_DE) |
| apply_start/end | 청약기간(접수 시작/종료) |
| winner_date | 당첨자발표일(PRZWNER_PRESNATN_DE) |
| supply_type | 주택구분(민영/국민)/공급유형 |
| newlywed | 신혼희망타운 여부 + 키워드(BR-4) |
| priority | 순위 정보 → mapPriority |
| url | applyhome 상세 URL |

## 2. 마이홈 LH 임대 (source=lh, 15088707)
| 타깃 | 소스 후보 |
|---|---|
| source_no | 공고일련번호 |
| title | 공고명 |
| region_* | 공급지역 → parseRegion |
| apply_end | 접수마감일 |
| supply_type | 임대유형(국민/영구/행복주택) |
| newlywed/pre_newlywed | 입주대상(신혼부부/예비신혼) 키워드(BR-4) |
| url | myhome 상세 |

## 3. 마이홈 공공임대 단지정보 (source 보강, 15110581)
- 단지명/임대유형/세대수/주소/입주지정기간. **독립 공고가 아니라 보강용** — 가능한 경우 LH 공고와 매칭해 area/세대 정보 보완. 매칭 불가 시 단지 자체를 source=lh 보조 레코드로 둘지 여부는 live 단계에서 결정.

## 4. SH 서울주택도시공사 (source=sh, 크롤링)
| 타깃 | 파싱 위치(HTML) |
|---|---|
| source_no | 상세 링크의 게시물 id |
| title | 목록 행 제목 |
| notice_date | 목록 공고일 |
| apply_end | 목록/상세 마감일(있으면) |
| region_sido | "서울"(고정) |
| url | 상세 페이지 절대 URL |
- 파싱 실패 항목은 skip + 로그 (BR-6.3). 구조 변경 대비 셀렉터를 한 곳에 모아 관리.

## 매핑 확정 체크 (live 전환 시)
- [ ] 각 API 실제 필드명/날짜 포맷 확인
- [ ] 페이지네이션/요청량(Free tier·일일) 확인
- [ ] 지역 별칭표 보강(실데이터 표기 확인 후)
