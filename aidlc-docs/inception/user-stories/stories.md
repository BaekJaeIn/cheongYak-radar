# 청약레이더 — User Stories

> Epic 기반 하이브리드 구조 (Q-S1=C) · 수용 기준 Given/When/Then (Q-S3=A) · 중간 상세도 (Q-S4=B)
> 각 스토리에 **볼트 번호 + MoSCoW 우선순위** 표기 (Q-S5=A)
> 페르소나: **P1**=신혼부부 청약 준비자, **P2**=데이터 파이프라인 운영자

**MoSCoW**: Must(필수) / Should(권장) / Could(선택)

---

## Epic E1 — 공고 자동수집 파이프라인 (볼트 2, 7)

### US-1.1 일일 자동수집 cron (볼트 2 · Must · P2)
**As** 운영자(P2), **I want** 매일 정해진 시각에 자동으로 공고를 수집하고 싶다 **so that** 손대지 않아도 최신 공고가 유지된다.

- **AC1** — Given Supabase Edge Function cron이 설정되어 있을 때, When 매일 07:00(KST)가 되면, Then 수집 함수가 자동 실행된다.
- **AC2** — Given 수집이 실행되면, When 완료되면, Then 실행 시각·소스별 건수·에러가 로그로 남는다.

### US-1.2 청약홈 분양정보 수집 (볼트 2 · Must · P2)
**As** 운영자(P2), **I want** 청약홈 분양정보 API로 분양 청약 공고를 수집하고 싶다 **so that** 분양 공고가 목록에 반영된다.

- **AC1** — Given 유효한 API 키가 있을 때, When 청약홈 API(15098547)를 호출하면, Then 공고번호·주택명·지역·청약기간·당첨발표일·주택유형이 파싱되어 `source='apt'`로 매핑된다.
- **AC2** — Given 응답에 신혼희망타운/신혼부부 정보가 있을 때, Then `newlywed`/`supply_type`에 반영된다.

### US-1.3 LH 임대공고 수집 (볼트 2 · Must · P2)
**As** 운영자(P2), **I want** 마이홈포털 LH 임대공고 API로 임대 공고를 수집하고 싶다 **so that** LH 임대 공고가 목록에 반영된다.

- **AC1** — Given LH API(15088707)를 호출하면, When 응답을 받으면, Then 공고명·임대유형·입주대상·지역·마감일이 파싱되어 `source='lh'`로 매핑된다.

### US-1.4 마이홈 공공임대 단지정보 수집 (볼트 2 · Should · P2)
**As** 운영자(P2), **I want** 공공임대 단지정보 API를 수집하고 싶다 **so that** 단지 메타정보를 보강할 수 있다.

- **AC1** — Given 광역시도/시군구 코드 파라미터로 API(15110581)를 호출하면, Then 단지명·임대유형·세대수·주소·입주지정기간이 수집된다.

### US-1.5 SH 공고 크롤링 (볼트 7 · Should · P2)
**As** 운영자(P2), **I want** SH 서울주택도시공사 공고를 크롤링하고 싶다 **so that** 공식 API가 없는 SH 공고도 포함된다.

- **AC1** — Given SH 공고 목록 페이지를 fetch하면, When HTML을 파싱(cheerio)하면, Then 공고명·공고일·마감일·상세 URL이 추출되어 `source='sh'`로 저장된다.
- **AC2** — Given 페이지 구조가 변경되어 파싱이 실패할 때, Then 에러를 로깅하고 해당 소스만 skip하며 다른 소스 수집은 계속된다. (NFR-4)

### US-1.6 소스별 에러 격리 (볼트 2 · Must · P2)
**As** 운영자(P2), **I want** 한 소스가 실패해도 나머지는 계속 수집되길 원한다 **so that** 부분 장애가 전체 수집을 막지 않는다.

- **AC1** — Given 4개 소스 중 하나가 예외/타임아웃이 날 때, When 수집이 진행되면, Then 나머지 소스는 정상 수집되고 실패 소스는 로그에 기록된다.

### US-1.7 목업 데이터 모드 (볼트 2 · Must · P2)
**As** 운영자(P2), **I want** API 키 확보 전 목업 데이터로 수집 흐름을 대체하고 싶다 **so that** 키 없이도 개발/검증이 가능하다. (C-1)

- **AC1** — Given API 키가 없거나 목업 모드일 때, When 수집을 실행하면, Then 실제 스키마와 동일한 목업 공고가 `notices`에 적재된다.
- **AC2** — Given 키가 준비되면, When 모드를 전환하면, Then 코드 변경 없이(환경변수만으로) 실데이터 수집으로 바뀐다.

---

## Epic E2 — 데이터 모델 / 저장 (볼트 3)

### US-2.1 notices 스키마 & upsert (볼트 3 · Must · P2)
**As** 운영자(P2), **I want** 공고를 공고번호 기준으로 upsert 저장하고 싶다 **so that** 중복 없이 최신 상태를 유지한다. (NFR-5)

- **AC1** — Given 동일 `id`(공고번호) 공고가 이미 있을 때, When 다시 수집되면, Then `ON CONFLICT DO UPDATE`로 갱신되고 `updated_at`이 변경된다.
- **AC2** — Given 신규 공고일 때, Then 새 행으로 insert되며 `created_at`이 기록된다.
- **AC3** — Given 원본 응답이 있을 때, Then `raw`(JSONB)에 원본이 보존된다.

### US-2.2 조회 인덱스 (볼트 3 · Should · P2)
**As** 운영자(P2), **I want** 지역·유형·면적 인덱스를 두고 싶다 **so that** 필터 조회가 1초 내로 빠르다. (NFR-1)

- **AC1** — Given region_sigu/source/area에 인덱스가 있을 때, When 필터 쿼리가 실행되면, Then 인덱스를 사용해 응답한다.

### US-2.3 RLS 익명 읽기전용 (볼트 3 · Must · P2)
**As** 운영자(P2), **I want** 익명 클라이언트가 공고를 읽기만 가능하게 하고 싶다 **so that** 데이터가 변조되지 않는다.

- **AC1** — Given 익명(anon) 키로 접근할 때, When `notices`를 select하면, Then 성공한다.
- **AC2** — Given 익명 키로 insert/update/delete를 시도하면, Then RLS에 의해 거부된다.

---

## Epic E3 — 공고 탐색 · 필터 (볼트 4)

### US-3.1 신규 공고 강조 & NEW 배지 (볼트 4 · Must · P1)
**As** 사용자(P1), **I want** 오늘 새로 올라온 공고를 상단에서 보고 싶다 **so that** 신규 공고를 놓치지 않는다.

- **AC1** — Given 오늘 등록된(created_at=오늘) 공고가 있을 때, When 목록을 열면, Then 상단에 강조되고 NEW 배지가 표시된다.

### US-3.2 유형/신혼부부 배지 (볼트 4 · Must · P1)
**As** 사용자(P1), **I want** 공고 유형과 신혼부부 가능 여부를 배지로 보고 싶다 **so that** 한눈에 구분한다.

- **AC1** — Given 공고의 source가 apt/lh/sh/private일 때, Then `분양`/`LH임대`/`SH임대`/`민간임대` 배지가 표시된다.
- **AC2** — Given `newlywed=true`일 때, Then 신혼부부 특공 태그가 표시된다.
- **AC3** — Given 색상 배지일 때, Then 색상 외 텍스트 라벨도 병기된다. (NFR-7)

### US-3.3 D-day & 마감 자동숨김 (볼트 4 · Must · P1)
**As** 사용자(P1), **I want** 청약 마감까지 D-day를 보고 마감된 공고는 숨기고 싶다 **so that** 유효한 공고에 집중한다.

- **AC1** — Given apply_end가 미래일 때, Then D-3, D-7 형태의 카운트다운이 표시된다.
- **AC2** — Given apply_end < 오늘일 때, When 목록을 열면, Then 해당 공고는 기본적으로 숨겨진다.

### US-3.4 목록 필터링 (볼트 4 · Must · P1)
**As** 사용자(P1), **I want** 지역·면적·유형·순위·신혼부부 조건으로 목록을 거르고 싶다 **so that** 내게 맞는 공고만 본다.

- **AC1** — Given 설정에 필터가 저장돼 있을 때, When 목록을 열면, Then 해당 조건(지역/면적범위/유형/순위/신혼부부)으로 필터링된 결과가 보인다.
- **AC2** — Given 여러 필터가 동시에 설정될 때, Then 모든 조건이 AND로 적용된다.

### US-3.5 무한 스크롤/페이지네이션 (볼트 4 · Should · P1)
**As** 사용자(P1), **I want** 많은 공고를 끊김 없이 탐색하고 싶다 **so that** 편하게 둘러본다.

- **AC1** — Given 공고가 한 페이지 분량을 넘을 때, When 하단에 도달하면, Then 다음 묶음이 추가로 로드된다.

### US-3.6 필터 설정 저장 (볼트 4 · Must · P1)
**As** 사용자(P1), **I want** 관심 지역/면적/유형/순위/신혼부부 설정을 저장하고 싶다 **so that** 매번 다시 설정하지 않는다. (Q3=A localStorage)

- **AC1** — Given `/settings`에서 값을 변경하면, When 저장하면, Then localStorage에 저장되고 목록/상세에 반영된다.
- **AC2** — Given 최초 진입일 때, Then 관심 지역 기본값(안양·군포·의왕·서울)이 설정돼 있다. (C-5)
- **AC3** — Given 앱을 다시 열 때, Then 이전 설정이 그대로 복원된다.

---

## Epic E4 — 공고 상세 · AI 요약 (볼트 5)

### US-4.1 면적별 세대수 테이블 (볼트 5 · Must · P1)
**As** 사용자(P1), **I want** 전용면적별 세대수를 표로 보고 싶다 **so that** 공급 규모를 파악한다.

- **AC1** — Given 공고 상세에 면적/세대수 데이터가 있을 때, When `/notice/[id]`를 열면, Then 면적별 세대수 테이블이 표시된다.

### US-4.2 청약 일정 타임라인 (볼트 5 · Must · P1)
**As** 사용자(P1), **I want** 모집공고→청약→당첨발표→계약 일정을 타임라인으로 보고 싶다 **so that** 일정을 한눈에 본다.

- **AC1** — Given notice_date/apply_start/apply_end/winner_date가 있을 때, Then 순서대로 타임라인이 그려지고 현재 단계가 강조된다.

### US-4.3 자격조건 AI 요약 (볼트 5 · Must · P1)
**As** 사용자(P1), **I want** 자격조건을 쉬운 말로 요약받고 싶다 **so that** "나한테 해당되나요?"를 빠르게 판단한다. (Q5=A)

- **AC1** — Given 공고 자격조건 원문이 있을 때, When 상세를 열면, Then Claude API(claude-opus-4-8)가 요약한 자격조건이 표시된다.
- **AC2** — Given AI 요약이 생성될 때, Then 비용/속도를 위해 결과가 캐시(저장)되어 재방문 시 재호출하지 않는다.
- **AC3** — Given Claude API 호출이 실패할 때, Then 원문 표시로 폴백하고 오류로 화면이 깨지지 않는다.
- **AC4** — Given Claude API 키는, Then 서버(Edge Function/환경변수)에만 보관되고 클라이언트에 노출되지 않는다. (NFR-3)

### US-4.4 원문 링크 (볼트 5 · Must · P1)
**As** 사용자(P1), **I want** 공식 원문 공고로 이동하고 싶다 **so that** 상세 신청 정보를 확인한다.

- **AC1** — Given 공고에 url이 있을 때, Then 청약홈/마이홈/SH 원문 링크가 새 탭으로 열린다.

---

## Epic E5 — 개인화 · PWA · 알림 (볼트 1, 6)

### US-5.1 북마크 추가/제거 (볼트 6 · Must · P1)
**As** 사용자(P1), **I want** 관심 공고를 북마크하고 싶다 **so that** 나중에 다시 본다. (localStorage)

- **AC1** — Given 상세/목록에서 북마크 버튼을 누르면, Then 해당 공고가 localStorage에 저장/해제된다.
- **AC2** — Given 앱을 다시 열 때, Then 북마크 상태가 유지된다.

### US-5.2 관심 공고 목록 (볼트 6 · Must · P1)
**As** 사용자(P1), **I want** 북마크 목록을 마감 임박순으로 보고 싶다 **so that** 놓치지 않는다.

- **AC1** — Given `/bookmarks`를 열면, Then 북마크된 공고가 마감 임박(apply_end 오름차순) 순으로 정렬된다.
- **AC2** — Given 만료된(apply_end<오늘) 북마크 공고일 때, Then 흐리게(비활성) 표시된다.

### US-5.3 PWA 설치 & 오프라인 (볼트 1 · Must · P1)
**As** 사용자(P1), **I want** 홈화면에 설치하고 오프라인에서도 열고 싶다 **so that** 앱처럼 빠르게 쓴다.

- **AC1** — Given manifest.json과 서비스워커가 있을 때, When 브라우저에서 접속하면, Then 홈화면 설치가 가능하다.
- **AC2** — Given 오프라인 상태일 때, When 앱을 열면, Then 캐시된 목록을 열람할 수 있다. (NFR-6)

### US-5.4 Web Push 신규공고 알림 (볼트 6 · Should · P1, P2)
**As** 사용자(P1), **I want** 새 공고가 등록되면 알림을 받고 싶다 **so that** 즉시 확인한다. (Q6=A)

- **AC1** — Given 사용자가 알림을 허용(구독)하면, Then 구독 정보가 Supabase에 저장된다.
- **AC2** — Given 수집 단계에서 신규 공고가 생기면, When 발송이 트리거되면, Then 구독자에게 Web Push 알림이 전송된다.
- **AC3** — Given VAPID 키는, Then 서버에만 보관된다. (NFR-3)

---

## 페르소나 ↔ 스토리 매핑

| 스토리 | P1 사용자 | P2 운영 | 볼트 | 우선순위 |
|---|:---:|:---:|:---:|:---:|
| US-1.1 일일 cron | | ✅ | 2 | Must |
| US-1.2 청약홈 수집 | | ✅ | 2 | Must |
| US-1.3 LH 수집 | | ✅ | 2 | Must |
| US-1.4 단지정보 수집 | | ✅ | 2 | Should |
| US-1.5 SH 크롤링 | | ✅ | 7 | Should |
| US-1.6 에러 격리 | | ✅ | 2 | Must |
| US-1.7 목업 모드 | | ✅ | 2 | Must |
| US-2.1 upsert 스키마 | | ✅ | 3 | Must |
| US-2.2 인덱스 | | ✅ | 3 | Should |
| US-2.3 RLS | | ✅ | 3 | Must |
| US-3.1 NEW 배지 | ✅ | | 4 | Must |
| US-3.2 유형/신혼 배지 | ✅ | | 4 | Must |
| US-3.3 D-day/마감숨김 | ✅ | | 4 | Must |
| US-3.4 필터링 | ✅ | | 4 | Must |
| US-3.5 무한스크롤 | ✅ | | 4 | Should |
| US-3.6 설정 저장 | ✅ | | 4 | Must |
| US-4.1 세대수 테이블 | ✅ | | 5 | Must |
| US-4.2 일정 타임라인 | ✅ | | 5 | Must |
| US-4.3 AI 요약 | ✅ | | 5 | Must |
| US-4.4 원문 링크 | ✅ | | 5 | Must |
| US-5.1 북마크 | ✅ | | 6 | Must |
| US-5.2 관심 목록 | ✅ | | 6 | Must |
| US-5.3 PWA 설치/오프라인 | ✅ | | 1 | Must |
| US-5.4 Web Push | ✅ | ✅ | 6 | Should |

---

## INVEST 준수 노트
- **Independent**: 수집(E1)·저장(E2)·UI(E3~E5)를 분리, 스토리 간 의존은 최소화(예: UI는 목업/실데이터 무관).
- **Negotiable**: 각 스토리는 구현 세부가 아닌 의도+AC로 기술.
- **Valuable**: 모든 스토리가 P1 사용자 가치 또는 P2 신뢰성 가치를 가짐.
- **Estimable**: 화면/기능 단위 중간 상세도로 추정 가능.
- **Small**: 단일 화면/단일 소스/단일 책임 단위로 분할.
- **Testable**: 각 스토리에 Given/When/Then 수용 기준 포함.

**총 24개 스토리** · 5 Epic · 2 페르소나
