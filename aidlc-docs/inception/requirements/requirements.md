# 청약레이더 (CheongYak Radar) — Requirements

> 분양 청약·임대 공고를 매일 자동 수집·필터링해주는 개인 맞춤형 PWA

---

## 1. Intent Analysis Summary

| 항목 | 내용 |
|---|---|
| **User Request** | "SPEC.md 기반으로 시작" — SPEC.md에 정의된 청약레이더 PWA를 AI-DLC 워크플로우로 개발 |
| **Request Type** | New Project (Greenfield) |
| **Scope Estimate** | System-wide — Frontend(PWA) + Backend(Supabase) + 외부 공공 API/크롤링 연동 |
| **Complexity Estimate** | Moderate~Complex (다중 외부 데이터소스, 자동수집 파이프라인, 다중 화면 UI, PWA/Push) |
| **Requirements Depth** | Standard~Comprehensive |
| **Confirmed Scope** | **볼트 1~7 전체** (SH 크롤링 포함) — 한 번에 개발 |

---

## 2. Confirmed Decisions (from clarifying questions)

| # | 질문 | 결정 |
|---|---|---|
| Q1 / 명확화 | MVP 범위 | **볼트 1~7 전체** (셋업·수집·DB·목록UI·상세UI·북마크·SH크롤링) |
| Q2 | data.go.kr API 키 | **미발급** → 발급 전까지 **목업 데이터로 개발**, 키 확보 후 실연동 |
| Q3 | 인증/저장 | **인증 없음** — 필터 설정·북마크 모두 **localStorage** 저장 |
| Q4 | 자동수집 cron | **Supabase Edge Function cron** (매일 07:00) |
| Q5 | 자격조건 요약 | **포함** — Claude API로 요약 (최신 모델 `claude-opus-4-8`) |
| Q6 | Web Push 알림 | **포함** — PWA Web Push로 신규공고 알림 |
| Q7 | 사용자 규모 | **개인용 비공개 도구** (본인/가족 소수) |
| Q8 | 추가 변경 | 없음 — SPEC.md 그대로 |

### Extension Configuration
| Extension | Enabled |
|---|---|
| Security Baseline | **No** (개인용 도구) |
| Resiliency Baseline | **No** |
| Property-Based Testing | **No** |

> 참고: 인증 없음·개인용이라는 전제로 보안/회복성 확장을 비활성화했습니다. 단, 공개 배포(Vercel)되는 PWA이므로 **API 키는 서버(Edge Function/환경변수)에만 보관**하고 클라이언트에 노출하지 않는다는 최소 원칙은 비기능 요구사항(NFR-3)으로 유지합니다.

---

## 3. Functional Requirements

### FR-1. 공고 자동 수집 (볼트 2)
- FR-1.1 매일 07:00(KST) Supabase Edge Function cron이 자동 실행된다.
- FR-1.2 청약홈 분양정보 API(data.go.kr 15098547)를 호출해 분양 청약 공고를 수집한다.
- FR-1.3 마이홈포털 LH 임대공고 API(15088707)를 호출해 임대 공고를 수집한다.
- FR-1.4 마이홈포털 공공임대 단지정보 API(15110581)를 호출해 단지정보를 수집한다.
- FR-1.5 SH 서울주택도시공사 공고를 HTML 크롤링(cheerio)으로 수집한다. (볼트 7)
- FR-1.6 수집 데이터를 `notices` 테이블에 `id`(공고번호) 기준 `ON CONFLICT DO UPDATE`로 upsert한다.
- FR-1.7 API 키 확보 전까지는 동일 스키마의 **목업 데이터**로 수집 흐름을 대체 가능해야 한다.

### FR-2. 데이터 모델 / DB (볼트 3)
- FR-2.1 `notices` 테이블: id, source(apt|lh|sh|private), title, region_sido, region_sigu, area_min/max, notice_date, apply_start/end, winner_date, supply_type, newlywed, pre_newlywed, priority, url, raw(JSONB), created_at, updated_at. (SPEC §7)
- FR-2.2 `bookmarks` 관련: 인증 없음(Q3=A)이므로 **북마크는 클라이언트 localStorage**에 저장한다. (SPEC의 bookmarks 테이블은 보류/선택)
- FR-2.3 지역(region_sigu)·유형(source)·면적(area)에 대한 조회 인덱스를 생성한다.
- FR-2.4 RLS(Row Level Security): 익명 클라이언트는 `notices`에 대해 **읽기 전용(select)**만 허용한다.

### FR-3. 공고 목록 화면 `/` (볼트 4)
- FR-3.1 오늘 신규 등록 공고를 상단에 강조하고 NEW 배지를 표시한다.
- FR-3.2 유형 배지(`분양`/`LH임대`/`SH임대`/`민간임대`)를 표시한다.
- FR-3.3 신혼부부 특공 가능 여부 태그를 표시한다.
- FR-3.4 청약 마감일 기준 D-day 카운트다운(D-3, D-7 등)을 표시한다.
- FR-3.5 마감된 공고(apply_end < now)는 기본적으로 자동 숨김한다.
- FR-3.6 무한 스크롤 또는 페이지네이션을 제공한다.
- FR-3.7 필터(아래 FR-6) 조건을 목록에 반영한다.

### FR-4. 공고 상세 화면 `/notice/[id]` (볼트 5)
- FR-4.1 전용면적별 세대수 테이블을 표시한다.
- FR-4.2 청약 일정 타임라인(모집공고 → 청약 → 당첨자발표 → 계약)을 표시한다.
- FR-4.3 자격조건 요약을 **Claude API**로 생성해 "나한테 해당되나요?" 형태로 제공한다. (Q5=A)
- FR-4.4 원문 공고 링크(청약홈/마이홈포털/SH)를 제공한다.
- FR-4.5 북마크 추가/제거 버튼을 제공한다.

### FR-5. 관심 공고 화면 `/bookmarks` (볼트 6)
- FR-5.1 북마크된 공고 목록을 표시한다. (localStorage 기반)
- FR-5.2 마감 임박 공고를 상단 정렬한다.
- FR-5.3 만료된 공고를 흐리게 표시한다.

### FR-6. 필터 설정 화면 `/settings` (볼트 4 연계)
- FR-6.1 관심 지역(시/구) 다중 선택. 기본값: 안양(평촌)·군포(산본)·의왕·서울. (SPEC §4)
- FR-6.2 전용면적 최소~최대 슬라이더(예 40㎡~85㎡).
- FR-6.3 공고 유형(분양/LH임대/SH임대/민간임대) 복수 선택 토글.
- FR-6.4 신혼부부 특공 / 예비신혼부부 허용 필터.
- FR-6.5 청약 순위(1순위/2순위/무순위) 토글.
- FR-6.6 설정값을 **localStorage**에 저장하고 목록/상세에 반영한다. (Q3=A)

### FR-7. PWA / 알림 (볼트 1, 6)
- FR-7.1 `manifest.json` + 서비스워커로 홈화면 설치를 지원한다.
- FR-7.2 오프라인 캐싱(`next-pwa`)을 제공한다.
- FR-7.3 신규 공고 등록 시 **Web Push 알림**을 발송한다. (Q6=A) — 구독 정보는 Supabase에 저장, 발송은 Edge Function에서 트리거.

---

## 4. Non-Functional Requirements

- **NFR-1 (성능)**: 목록/상세 화면은 Supabase DB 직접 쿼리로 1초 이내 응답을 목표로 한다. 인덱스(FR-2.3)로 지역/유형/면적 필터를 가속한다.
- **NFR-2 (가용성/비용)**: Supabase Free tier + Vercel Free tier 범위 내에서 동작하도록 설계한다. (개인용)
- **NFR-3 (비밀정보 보호)**: data.go.kr API 키, Claude API 키, Web Push VAPID 키는 **서버(Edge Function)·환경변수에만** 보관하고 클라이언트 번들에 노출하지 않는다. *(Security 확장은 Off지만 이 최소 원칙은 유지)*
- **NFR-4 (수집 견고성)**: 외부 API 1개가 실패해도 나머지 소스 수집은 계속되어야 한다(소스별 독립 처리·에러 격리). 크롤링(SH)은 구조 변경에 대비해 파싱 실패 시 로깅 후 skip.
- **NFR-5 (데이터 정합)**: 중복 공고는 공고번호(id) 기준 upsert로 단일화한다.
- **NFR-6 (사용성/PWA)**: 모바일 우선 반응형, 홈화면 설치 가능, 오프라인 시 캐시된 목록 열람 가능.
- **NFR-7 (접근성)**: 배지/태그는 색상 외 텍스트 라벨도 병기한다.
- **NFR-8 (유지보수)**: 데이터소스(어댑터)별 수집 로직을 분리해 소스 추가/변경이 용이하도록 한다.

---

## 5. User Scenarios (요약)

- **US-A 매일 아침 확인**: 사용자가 PWA를 열면, 어젯밤~오늘 새로 올라온 안양/산본 지역 신혼부부 특공 공고가 NEW 배지와 D-day로 상단에 보인다.
- **US-B 필터 맞춤**: 처음 진입 시 관심 지역·면적·유형을 설정하면 이후 목록이 해당 조건으로 필터링된다. (localStorage 유지)
- **US-C 상세 검토**: 공고를 눌러 면적별 세대수·일정 타임라인을 보고, AI가 요약한 자격조건으로 "내가 신청 가능한지"를 빠르게 판단한다.
- **US-D 북마크 관리**: 관심 공고를 북마크하고, 마감 임박 순으로 정렬해 놓치지 않는다.
- **US-E 알림**: 새 공고가 들어오면 Web Push로 알림을 받는다.

---

## 6. Constraints & Assumptions

- **C-1**: data.go.kr API 키 미발급 상태 → 초기 개발은 목업 데이터, 키 확보 시 실데이터로 전환. (개발 차단요소 아님)
- **C-2**: 인증 없음 — 멀티 디바이스 동기화는 범위 외(설정·북마크는 기기 로컬).
- **C-3**: SH는 공식 Open API 미제공 → HTML 크롤링 의존(구조 변경 리스크 존재).
- **C-4**: Free tier 비용 한계 — cron 빈도/요청량을 그 안에서 유지.
- **C-5**: 관심 지역 기본값은 경기 안양·군포·의왕 + 서울. (개인 타겟)

---

## 7. Out of Scope (이번 범위 제외)

- 청약 경쟁률 조회 API 연동 (SPEC §10 향후)
- GitHub Actions 수집 이중화 (SPEC §10 향후)
- 로그인 기반 기기 간 동기화

---

## 8. Key Requirements Summary

- **데이터 파이프라인**: 4개 외부 소스(청약홈/LH/마이홈단지/SH크롤링) → Supabase `notices` upsert, 매일 07:00 cron.
- **3+1 화면**: 목록(`/`) · 상세(`/notice/[id]`) · 북마크(`/bookmarks`) · 설정(`/settings`).
- **개인화**: localStorage 필터·북마크, 관심 지역 기본값.
- **AI**: 자격조건 Claude 요약. **PWA**: 설치 + Web Push 알림.
- **전제**: 인증 없음·개인용·Free tier·API 키는 서버 보관.
