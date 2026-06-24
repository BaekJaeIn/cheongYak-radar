# U1 수집 파이프라인 — Business Rules

> 결정: 규칙 파서+별칭(Q-FU1=A), 키워드 신혼 추론(Q-FU2=A), 현실 목업 15~25건(Q-FU3=A), 요약 누락분만(Q-FU4=A).

## BR-U1-1. 정규화 공통 (Normalizer, C2)
- BR-1.1 모든 소스 응답은 `NoticeInput`(U2 타입)으로 정규화. `id`는 U2 `makeNoticeId(source, source_no)`로 합성.
- BR-1.2 누락 필드는 null 허용. 필수(`source_no`, `source`, `title`) 없으면 해당 항목 skip + 로그.
- BR-1.3 원본 응답은 `raw`에 그대로 보존.

## BR-U1-2. 주소 → 지역 파싱 (Q-FU1=A)
- BR-2.1 시도 추출: 정규식으로 "서울/경기/인천/…" 1개를 region_sido로.
- BR-2.2 시군구 추출: "○○시/○○군/○○구" 패턴 첫 매치를 region_sigu로.
- BR-2.3 **별칭 매핑 테이블** 적용(생활권명 → 행정구역):
  - 평촌 → 안양시, 산본 → 군포시, 인덕원 → 안양시(의왕 경계 표기 다양), 백운밸리 → 의왕시 등.
- BR-2.4 파싱 실패 시 region_*는 null(필터에서 누락되더라도 데이터는 보존).

## BR-U1-3. 면적 파싱 (area_min/max)
- BR-3.1 "전용 59.97㎡" 등에서 숫자 추출. 여러 면적 표기면 min/max로.
- BR-3.2 단일 면적이면 min=max. 없으면 null.

## BR-U1-4. 신혼 추론 (Q-FU2=A)
- BR-4.1 `supply_type`/`title`/원본 텍스트에 "신혼희망" 또는 "신혼부부" 포함 → `newlywed=true`.
- BR-4.2 "예비신혼" 포함 → `pre_newlywed=true`.
- BR-4.3 소스가 전용 필드를 제공하면 그 값을 우선, 없으면 키워드 규칙.

## BR-U1-5. 순위(priority) 매핑
- BR-5.1 "무순위"/"줍줍" → 무순위. "1순위" → 1순위. "2순위" → 2순위. 불명확 시 null.

## BR-U1-6. 소스별 독립 실행 & 에러 격리 (US-1.6, NFR-4)
- BR-6.1 Orchestrator는 4개 Collector를 독립 실행(Promise.allSettled 패턴).
- BR-6.2 한 소스의 fetch/parse 예외는 그 소스만 실패 처리(count=0, error 기록), 나머지는 계속.
- BR-6.3 SH 크롤링(US-1.5) 파싱 실패는 항목 단위로 skip + 로그(전체 중단 금지).

## BR-U1-7. 목업 모드 (US-1.7, Q-FU3=A)
- BR-7.1 `COLLECT_MODE=mock` 또는 키 없음 → MockDataProvider가 실 Collector를 대체.
- BR-7.2 목업 세트: 안양/군포/의왕/서울 + 4개 source 골고루, 마감 전/임박(D-3 등)/마감 섞기, 신혼/예비신혼/무순위 포함, 약 15~25건.
- BR-7.3 `COLLECT_MODE=live`로 전환 시 코드 변경 없이 실 Collector 사용(환경변수만).

## BR-U1-8. 요약 트리거 (Q-FU4=A, Q-A4=A)
- BR-8.1 upsert 완료 후, `eligibility_summary IS NULL`인 공고를 대상으로 Claude 요약 생성(C6) → 재저장.
- BR-8.2 요약 실패는 비차단(해당 공고 summary=null 유지, 다음 실행에서 재시도).
- BR-8.3 비용 보호: 1회 실행당 요약 대상 상한(예 N건)을 두고 초과분은 다음 실행으로 이월(설정값).

## BR-U1-9. 푸시 트리거 (US-5.4 연계)
- BR-9.1 upsert 결과 `inserted`(신규 id)가 있으면 U5 PushDispatcher를 트리거.
- BR-9.2 갱신(updated)은 푸시 대상 아님.

## BR-U1-10. 실행 로깅 (US-1.1 AC2)
- BR-10.1 실행 시각, 소스별 건수, 에러, inserted/updated 수, 요약 생성 수를 로그로 남김.
