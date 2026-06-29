# 청약레이더 (CheongYak Radar)

> 분양 청약·임대 공고를 매일 자동 수집·필터링하고, 개인 조건에 맞춰 추천해주는 개인 맞춤형 PWA

경기 안양(평촌)·군포(산본)·의왕 및 서울 지역의 분양 청약 / LH·SH 임대 / 민간임대 공고를
매일 자동으로 수집하고, 사용자가 설정한 가구 프로필(지역·면적·신혼부부 여부 등)에 맞게
점수화해 추천 피드로 보여줍니다. 신규·마감임박 공고는 Web Push로 알려줍니다.

---

## 주요 기능

- **공고 자동 수집** — 청약홈·마이홈포털(LH)·SH·민간임대 공고를 매일 자동 수집·정규화 후 DB upsert (공고번호 기준 중복 제거)
- **개인 맞춤 추천** — 가구 프로필 기반 매칭/스코어링 엔진으로 공고를 점수화하고 추천 이유(매칭 사유)를 함께 제공
- **공고 피드** — 유형 배지(분양·LH임대·SH임대·민간임대), NEW 배지, D-day 카운트다운, 마감 공고 자동 숨김
- **공고 상세** — 청약 일정 타임라인, 면적별 정보, 자격조건 요약(AI), 원문 링크
- **AI 자격조건 요약** — Google Gemini로 복잡한 자격조건 원문을 요약
- **북마크** — 관심 공고 저장, 마감 임박 정렬
- **PWA + 웹 푸시** — 홈화면 설치, 신규/마감임박 공고 푸시 알림 (제목 표시 + 클릭 시 상세 이동)
- **프로필 연동 자동 재계산** — 프로필 변경 시 DB 트리거로 추천 즉시 재계산

---

## 기술 스택

| 영역       | 사용 기술                                                              |
| ---------- | --------------------------------------------------------------------- |
| Frontend   | Next.js 14 (App Router), TypeScript, Tailwind CSS                     |
| PWA        | 서비스워커(`public/sw.js`), `manifest.json`, Web Push API             |
| Backend/DB | Supabase (PostgreSQL, Edge Functions, pg_cron, Vault)                 |
| AI 요약    | Google Gemini (`gemini-2.0-flash`)                                    |
| 배포       | Vercel (프론트엔드) · Supabase (DB / Edge Functions / cron)           |
| 테스트     | Vitest                                                                |

---

## 디렉터리 구조

```text
src/
├── app/                     # Next.js App Router
│   ├── page.tsx             # / 추천 피드
│   ├── notice/[id]/         # 공고 상세
│   ├── bookmarks/           # 관심 공고
│   ├── settings/            # 프로필/필터 설정
│   └── api/
│       ├── subscribe/       # 웹 푸시 구독 저장
│       └── profile/         # 가구 프로필 저장
└── features/                # 기능별 모듈 (feed, detail, recommendations,
                             #   notices, profile, bookmarks, notifications, pwa, nav)

supabase/
├── functions/collect/       # 공고 수집 Edge Function
│   ├── collectors/          # apply-home, lh, sh, myhome-complex, gh
│   ├── recommend/           # 매칭/스코어링 추천 엔진
│   ├── summarize.ts         # Gemini 자격조건 요약
│   └── normalize.ts, upsert.ts, criteria.ts ...
├── migrations/              # DB 스키마 · cron · 트리거
└── seed.sql

scripts/                     # 공공데이터 API 프로브 스크립트
aidlc-docs/                  # AI-DLC 산출물 (요구사항·설계·계획 문서)
```

---

## 연동 공공 API

| 출처                        | 제공기관       | 비고                                  |
| --------------------------- | -------------- | ------------------------------------- |
| 청약홈 분양정보 조회 서비스 | 한국부동산원   | data.go.kr `15098547`                 |
| 마이홈포털 임대주택 공고    | LH 한국토지주택공사 | data.go.kr `15088707`            |
| 마이홈포털 공공임대 단지정보| 국토교통부     | data.go.kr `15110581`                 |
| SH 서울주택도시공사 임대공고| SH             | HTML 크롤링 (공식 API 미제공)         |

`data.go.kr` 키 한 개로 공공데이터 API를 사용합니다 (무료, 즉시 발급).

---

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`를 복사해 `.env.local`을 만들고 값을 채웁니다.

```bash
cp .env.example .env.local
```

| 변수                            | 설명                                                          |
| ------------------------------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase 프로젝트 URL                                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 조회용 anon key (RLS 보호)                                    |
| `SUPABASE_SERVICE_ROLE_KEY`     | 수집/쓰기용 — **서버 전용, 커밋 금지**                        |
| `GEMINI_API_KEY`                | 자격조건 AI 요약 ([발급](https://aistudio.google.com/apikey)) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`  | 웹 푸시 공개키 (`npx web-push generate-vapid-keys`)           |
| `VAPID_PRIVATE_KEY`             | 웹 푸시 비공개키 — **서버 전용, 노출 금지**                   |
| `COLLECT_MODE`                  | `mock`(목업) 또는 `live`(실제 API)                            |
| `DATA_GO_KR_API_KEY`            | data.go.kr 발급 키 (`live` 모드에서 필요)                     |

> API 키 없이도 `COLLECT_MODE=mock`으로 목업 데이터를 통해 전체 흐름을 체험할 수 있습니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인합니다.

---

## 스크립트

| 명령              | 설명                          |
| ----------------- | ----------------------------- |
| `npm run dev`     | 개발 서버                     |
| `npm run build`   | 프로덕션 빌드                 |
| `npm run start`   | 프로덕션 서버                 |
| `npm run lint`    | ESLint                        |
| `npm run typecheck` | 타입 체크 (`tsc --noEmit`)  |
| `npm run test`    | Vitest 단위 테스트            |

---

## 자동 수집 아키텍처

```text
Supabase pg_cron (매일, KST)
  └── Edge Function: collect
        ├── 청약홈 / LH / SH / 민간임대 API·크롤링 호출
        ├── normalize → 추천 스코어링 → notices upsert (공고번호 기준)
        ├── Gemini 자격조건 요약
        └── 신규/마감임박 공고 Web Push 발송

Next.js 앱
  └── Supabase DB 쿼리 (프로필·필터 적용) → 추천 피드 렌더링
```

- 중복 방지: 공고번호 `id` 기준 `ON CONFLICT DO UPDATE`
- cron 인증 키는 Supabase Vault에 저장 (Vercel cron 의존 제거)
- 프로필 변경 시 DB 트리거로 추천 자동 재계산

---

## 배포

- **프론트엔드**: Vercel — `main` 브랜치 푸시 시 자동 배포
- **DB / Edge Functions / cron**: Supabase — `supabase/migrations`로 스키마·cron·트리거 관리

---

_AI-DLC 방법론 적용 · 상세 스펙은 [SPEC.md](SPEC.md), 설계 산출물은 [aidlc-docs/](aidlc-docs/) 참고_
