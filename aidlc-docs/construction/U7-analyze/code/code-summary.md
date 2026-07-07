# U7 공고분석 — 코드 요약 (v4)

**변경요청**: v4 (공고분석 탭: PDF 자격판정) — requirements.md §14 FR-12 / functional-design D-1~D-3

## 생성/수정 파일

### Edge (Supabase Functions — collect)
- **Created** `supabase/functions/collect/analyze.ts` (C36)
  - `parseExtracted()` — Gemini JSON 응답 검증·정규화 (순수; 코드펜스 방어, 불량 값 드롭, 없는 값 미채움 D-2)
  - `toNoticeInput()` — 합성 NoticeInput 매핑 (순수; id=`analyze:upload`, 신혼/예비신혼 플래그 유도)
  - `extractFromPdf()` — Gemini `generateContent` inline_data(PDF base64) + `responseMimeType: application/json`, temperature 0 (summarize.ts 패턴, `GEMINI_MODEL` ?? gemini-2.0-flash)
  - `analyzePdf()` — 추출 → `household_profile`(id=1) 조회(BR-U7-7) → `evaluate()`+`loadCriteriaTable()` 판정(BR-U7-4) → `AnalyzeOutcome` (미저장 BR-U7-6)
  - 오류 코드: notAnnouncement / extractFailed / profileMissing / geminiUnavailable (BR-U7-8)
  - ⚠️ `Deno.env` 접근은 함수 내부로 한정 — 순수 함수를 Node(vitest)에서 import 가능
- **Modified** `supabase/functions/collect/index.ts` — POST body 1회 읽기로 리팩터링 + `action === "analyze"` 분기 (recompute/test-push 선례)
- **Created** `supabase/functions/collect/__tests__/analyze.test.ts` — 8 tests (parseExtracted 5, toNoticeInput 3)

### Next (Vercel)
- **Created** `src/app/api/analyze/route.ts` (C35) — nodejs·`maxDuration=60`; formData 수신 → `validatePdfFile` 재검증(400/413) → base64 → collect Edge `action:"analyze"` 호출(service_role, functionsBaseUrl 패턴) → outcome 그대로 반환, 전송 실패는 edgeError(502/500)
- **Created** `src/features/analyze/validate.ts` — `MAX_PDF_BYTES`(3MB)·`validatePdfFile()` (BR-U7-1, 클라·서버 공용 순수)
- **Created** `src/features/analyze/types.ts` — AnalyzeOutcome/ExtractedNotice/MatchResult 미러 (Edge 자기완결 미러 선례)
- **Created** `src/features/analyze/__tests__/validate.test.ts` — 4 tests (mime/확장자 폴백/크기 경계)
- **Created** `src/features/analyze/AnalyzePage.tsx` (C33, client) — idle/uploading/done/error 전이, 선택 즉시 검증, profileMissing 시 프로필 링크, testid `analyze-upload-input`/`analyze-submit-button`/`analyze-reset-button`
- **Created** `src/features/analyze/AnalyzeResultView.tsx` (C34) — 공급유형별 배지(가능 green/조건부 amber/불가 gray — 색+텍스트 NFR-7) + 사유, 추출 기준 병기(null → "공고에서 확인 불가"), disclaimer 상시, testid `analyze-result`
- **Created** `src/app/analyze/page.tsx` — RSC shell (settings 패턴)
- **Modified** `src/features/nav/BottomNav.tsx` — TABS에 공고분석 추가 (4탭, `tab-analyze`)

## 검증
- vitest **148 passed** (15 files; U7 신규 12)
- `tsc --noEmit` clean
- `next build` OK — `/analyze` 2.57kB, `/api/analyze` 라우트 생성 확인

## 배포 메모
- **Edge 재배포 필요**: `supabase functions deploy collect` (analyze action 반영)
- 신규 환경변수 없음 (GEMINI_API_KEY·SERVICE_ROLE_KEY 기존 값 사용). DB 변경 없음.
- Vercel: `/api/analyze` `maxDuration=60` — Hobby 플랜 한도 내.
