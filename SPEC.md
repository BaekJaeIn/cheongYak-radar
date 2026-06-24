# 청약레이더 (CheongYak Radar) — SPEC.md

> 분양 청약 및 임대 아파트 공고를 매일 자동 수집·필터링해주는 개인 맞춤형 PWA

---

## 1. 프로젝트 개요

| 항목         | 내용                                                                       |
| ------------ | -------------------------------------------------------------------------- |
| 프로젝트명   | 청약레이더 (CheongYak Radar)                                               |
| 레포지토리명 | `cheongYak-radar`                                                          |
| 형태         | PWA (Progressive Web App)                                                  |
| 목적         | 분양 청약·임대 공고를 매일 자동 수집하고, 개인 조건에 맞게 필터링하여 제공 |
| 타겟 사용자  | 경기 안양·산본·평촌 중심, 신혼부부 특공 관심                               |

---

## 2. 기술 스택

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **PWA**: `next-pwa` (서비스워커, 홈화면 설치)

### Backend / DB

- **BaaS**: Supabase
  - PostgreSQL DB
  - Edge Functions (공고 자동 수집 cron)
  - Auth (선택 — 로컬 필터 저장 시 사용)

### 배포

- **Frontend**: Vercel
- **DB / Functions**: Supabase (기본 Free tier)

---

## 3. 연동 공공 API

### 3-1. 청약홈 분양정보 조회 서비스

- **제공기관**: 한국부동산원
- **출처**: [data.go.kr](https://www.data.go.kr/data/15098547/openapi.do)
- **형식**: REST / JSON, XML
- **주요 데이터**: 공고번호, 주택명, 공급지역명, 공급위치, 모집공고일, 청약기간, 당첨자발표일, 주택유형(민영/국민), 신혼희망타운 포함
- **API 키**: data.go.kr 회원가입 후 발급 (무료, 즉시 발급)

### 3-2. 마이홈포털 임대주택 입주자모집공고

- **제공기관**: LH 한국토지주택공사
- **출처**: [data.go.kr](https://www.data.go.kr/data/15088707/fileData.do)
- **형식**: REST / JSON
- **주요 데이터**: 공고명, 임대유형(국민/영구/행복주택 등), 입주대상(신혼부부/대학생/주거취약계층), 공급지역, 공고일, 마감일
- **API 키**: 동일 data.go.kr 키 사용 가능

### 3-3. 국토교통부 마이홈포털 공공임대주택 단지정보

- **제공기관**: 국토교통부
- **출처**: [data.go.kr](https://www.data.go.kr/data/15110581/openapi.do)
- **형식**: REST / JSON
- **주요 데이터**: 단지명, 임대유형, 세대수, 동수, 주소, 준공일, 입주지정기간
- **파라미터**: 광역시도 코드, 시군구 코드

### 3-4. SH 서울주택도시공사 임대 공고 (크롤링)

- **출처**: [housing.seoul.go.kr](https://housing.seoul.go.kr/site/main/sh/publicLease/list)
- **형식**: HTML 크롤링 (공식 Open API 미제공)
- **방법**: Supabase Edge Function 내 fetch + HTML 파싱 (cheerio 등)
- **수집 항목**: 공고명, 공고일, 마감일, 상세 페이지 URL
- **개발 우선순위**: 볼트 7 (후순위)

---

## 4. 관심 지역

| 지역               | 비고            |
| ------------------ | --------------- |
| 경기 안양시 (평촌) | 1순위 관심 지역 |
| 경기 군포시 (산본) | 1순위 관심 지역 |
| 경기 의왕시        | 인근 지역 포함  |
| 서울 전체          | 2순위 관심      |

---

## 5. 필터 조건

| 필터                   | 상세                                               |
| ---------------------- | -------------------------------------------------- |
| 지역 (시/구)           | 다중 선택, 관심 지역 기본값 설정                   |
| 전용면적               | 최소~최대 슬라이더 (예: 40㎡ ~ 85㎡)               |
| 공고 유형              | 분양 청약 / LH 임대 / SH 임대 / 민간임대 복수 선택 |
| 청약 마감일            | D-day 표시, 마감 공고 자동 숨김                    |
| 예비신혼부부 가능 여부 | 신혼부부 특공 여부, 예비신혼 허용 여부 별도 표시   |
| 청약 순위              | 1순위 / 2순위 / 무순위(줍줍) 토글                  |

---

## 6. 주요 화면 구성

### 6-1. 공고 목록 (`/`)

- 오늘 신규 등록 공고 상단 강조 (NEW 배지)
- 유형 배지: `분양` `LH임대` `SH임대` `민간임대`
- 신혼부부 특공 가능 여부 태그
- D-day 카운트다운 (D-3, D-7 등)
- 무한 스크롤 또는 페이지네이션

### 6-2. 공고 상세 (`/notice/[id]`)

- 전용면적별 세대수 테이블
- 청약 일정 타임라인 (모집공고 → 청약 → 당첨자발표 → 계약)
- 자격조건 요약 (Claude API 활용 가능)
- 원문 공고 링크 (청약홈 / 마이홈포털 / SH 공식 페이지)
- 북마크 버튼

### 6-3. 필터 설정 (`/settings`)

- 관심 지역 다중 선택
- 면적 범위 슬라이더
- 공고 유형 토글
- 신혼부부 / 예비신혼부부 필터
- 설정값 Supabase 또는 localStorage 저장

### 6-4. 관심 공고 (`/bookmarks`)

- 북마크된 공고 목록
- 마감 임박 공고 상단 정렬
- 만료된 공고 흐리게 표시

---

## 7. DB 스키마 (초안)

### `notices` 테이블

```sql
CREATE TABLE notices (
  id           TEXT PRIMARY KEY,         -- 공고번호
  source       TEXT NOT NULL,            -- 'apt' | 'lh' | 'sh' | 'private'
  title        TEXT NOT NULL,            -- 공고명 / 주택명
  region_sido  TEXT,                     -- 시도 (경기, 서울 등)
  region_sigu  TEXT,                     -- 시군구 (안양시, 군포시 등)
  area_min     NUMERIC,                  -- 최소 전용면적 (㎡)
  area_max     NUMERIC,                  -- 최대 전용면적 (㎡)
  notice_date  DATE,                     -- 모집공고일
  apply_start  DATE,                     -- 청약 시작일
  apply_end    DATE,                     -- 청약 마감일
  winner_date  DATE,                     -- 당첨자발표일
  supply_type  TEXT,                     -- '일반' | '신혼부부' | '특별공급' 등
  newlywed     BOOLEAN DEFAULT FALSE,    -- 신혼부부 특공 여부
  pre_newlywed BOOLEAN DEFAULT FALSE,    -- 예비신혼부부 허용 여부
  priority     TEXT,                     -- '1순위' | '2순위' | '무순위'
  url          TEXT,                     -- 원문 링크
  raw          JSONB,                    -- API 원본 데이터
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### `bookmarks` 테이블

```sql
CREATE TABLE bookmarks (
  id          SERIAL PRIMARY KEY,
  user_id     TEXT,                      -- 비로그인 시 device_id
  notice_id   TEXT REFERENCES notices(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. 자동 수집 아키텍처

```
Supabase Edge Function (cron: 매일 오전 7시)
  ├── 청약홈 API 호출 → notices 테이블 upsert
  ├── 마이홈포털 API 호출 → notices 테이블 upsert
  └── SH 크롤링 (볼트 7) → notices 테이블 upsert

Next.js 앱
  └── Supabase DB 직접 쿼리 (필터 조건 적용)
```

- 중복 방지: `id` (공고번호) 기준 `ON CONFLICT DO UPDATE`
- 마감 공고: `apply_end < NOW()` 조건으로 클라이언트에서 자동 필터

---

## 9. 개발 로드맵 (7볼트)

| 볼트  | 내용                                                                                   | 우선순위 |
| ----- | -------------------------------------------------------------------------------------- | -------- |
| **1** | 프로젝트 셋업 — Next.js 14 + Supabase + PWA 기본 구성, `manifest.json`, 서비스워커     | 기반     |
| **2** | 공공데이터 API 키 발급 · Supabase Edge Function cron 구성 · 청약홈 + LH 공고 자동 수집 | 핵심     |
| **3** | DB 스키마 설계 · `notices` 테이블 + 지역/유형/면적 인덱스 · Row Level Security 설정    | 핵심     |
| **4** | 공고 목록 UI — 필터 적용, D-day 배지, 신혼부부 태그, NEW 배지                          | UI       |
| **5** | 공고 상세 UI — 청약 일정 타임라인, 자격조건 요약, 원문 링크                            | UI       |
| **6** | 관심 공고 저장 — 북마크 기능, PWA 홈화면 설치 유도, 마감 임박 알림                     | UI       |
| **7** | SH 서울주택도시공사 크롤링 연동 · 서울주거포털 공고 자동 파싱 추가                     | 확장     |

---

## 10. 향후 확장 고려사항

- **Claude API 연동**: 자격조건 원문을 AI가 요약하여 "나한테 해당되나요?" 형태로 제공
- **푸시 알림**: Web Push API — 신규 공고 등록 시 알림 (PWA)
- **경쟁률 조회**: 청약홈 청약 신청·당첨자 정보 조회 서비스 추가 연동
- **GH Actions 백업**: Vercel cron 또는 GitHub Actions로 Edge Function 이중화

---

## 11. 참고 링크

| 자료                    | URL                                                       |
| ----------------------- | --------------------------------------------------------- |
| 청약홈 분양정보 API     | https://www.data.go.kr/data/15098547/openapi.do           |
| 마이홈포털 임대공고 API | https://www.data.go.kr/data/15088707/fileData.do          |
| 마이홈포털 단지정보 API | https://www.data.go.kr/data/15110581/openapi.do           |
| SH 공공임대 공고        | https://housing.seoul.go.kr/site/main/sh/publicLease/list |
| 청약홈 공식             | https://www.applyhome.co.kr                               |
| 마이홈포털 공식         | https://www.myhome.go.kr                                  |

---

_최초 작성: 2026-06-24 · AI-DLC 방법론 적용_
