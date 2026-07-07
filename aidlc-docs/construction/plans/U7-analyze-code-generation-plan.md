# U7 공고분석 — Code Generation Plan (v4)

**단위**: U7 공고분석 (신규). **근거**: requirements.md §14 FR-12, U7 functional-design (D-1~D-3, BR-U7-1~9, C33~C36).
**의존**: U6 recommend 모듈(evaluate·loadCriteriaTable·types) — Edge 내부 재사용(D-1). U5 BottomNav. DB·마이그레이션 변경 없음.
**이 플랜이 Code Generation의 단일 소스(single source of truth).**

## 생성/수정 위치 (앱 코드는 워크스페이스 루트, brownfield in-place)
| 대상 | 경로 | 구분 |
|---|---|---|
| Edge 분석 모듈 | `supabase/functions/collect/analyze.ts` | Create |
| Edge action 라우팅 | `supabase/functions/collect/index.ts` | Modify |
| Edge 테스트 | `supabase/functions/collect/__tests__/analyze.test.ts` | Create |
| API 프록시 | `src/app/api/analyze/route.ts` | Create |
| 클라 타입·검증 | `src/features/analyze/types.ts`, `validate.ts` (+테스트) | Create |
| 화면 | `src/features/analyze/AnalyzePage.tsx`, `AnalyzeResultView.tsx`, `src/app/analyze/page.tsx` | Create |
| 하단 탭 | `src/features/nav/BottomNav.tsx` | Modify |
| 코드 요약 | `aidlc-docs/construction/U7-analyze/code/code-summary.md` | Create (docs) |

## Steps
- [x] Step 1: Edge 분석 모듈 `analyze.ts` — `ExtractedNotice` 타입, `parseExtracted()`(JSON 검증·isNotice·부분 null, 순수), `toNoticeInput()`(합성 매핑: id="analyze:upload", 신혼 플래그 유도, 순수), `extractFromPdf()`(Gemini inline_data + responseMimeType JSON, 없는 값 null 프롬프트 — summarize.ts 패턴), `analyzePdf()`(추출→프로필 조회(BR-U7-7)→`evaluate`+`loadCriteriaTable`→AnalyzeResult) (C36, BR-U7-2~6)
- [x] Step 2: `index.ts`에 `action === "analyze"` 분기 — `{ pdfBase64, mimeType }` 수신 → `analyzePdf` → JSON 응답, 오류 구조화 (recompute/test-push 선례)
- [x] Step 3: Edge 단위 테스트 — parseExtracted(정상/비공고/파싱 실패/부분 null), toNoticeInput(필드 매핑·플래그 유도) (vitest, 기존 collect 테스트 패턴)
- [x] Step 4: API 프록시 `src/app/api/analyze/route.ts` — nodejs·`maxDuration=60`, formData 파일 수신, mime·3MB 검증(400/413, BR-U7-1), base64 변환 → Edge 호출(/api/profile `functionsBaseUrl()` 패턴, service_role) → 응답·오류 매핑(BR-U7-8, profileMissing 코드 전달) (C35)
- [x] Step 5: 클라 타입·검증 — `types.ts`(AnalyzeResult·ExtractedNotice·SupplyTypeMatch 미러, Edge 자기완결 미러 선례), `validate.ts`(mime/size 순수 검증) + `__tests__/validate.test.ts` (BR-U7-1 경계)
- [x] Step 6: 화면 — `AnalyzePage.tsx`(client: idle/uploading/done/error 상태 전이, UploadBox, 재시도, testid `analyze-upload-input`·`analyze-submit-button`), `AnalyzeResultView.tsx`(공급유형별 배지 색+텍스트(NFR-7)+사유, ExtractedBlock "공고에서 확인 불가" 표기, disclaimer 상시, testid `analyze-result`), `src/app/analyze/page.tsx` (C33·C34, frontend-components.md)
- [x] Step 7: `BottomNav.tsx` TABS에 `{ href: "/analyze", label: "공고분석", testid: "tab-analyze" }` 추가 (4탭)
- [x] Step 8: 코드 요약 문서 — `aidlc-docs/construction/U7-analyze/code/code-summary.md` (+Edge 배포 필요 사항: `supabase functions deploy collect`)
- [x] Step 9: 검증 — vitest 전체, `tsc --noEmit`, `next build`

## 참고
- 프로필은 Edge가 DB에서 직접 조회(`household_profile` id=1, service.ts 패턴) — LLM 미전송 (BR-U7-3).
- 신규 환경변수 없음(GEMINI_API_KEY는 Edge 기존 설정 사용). 결과 미저장 (BR-U7-6).
- Gemini 모델: `GEMINI_MODEL` env ?? `gemini-2.0-flash` (summarize.ts와 동일).
