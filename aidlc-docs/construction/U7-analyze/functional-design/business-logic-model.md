# U7 공고분석 — 비즈니스 로직 모델 (v4, FR-12)

## 흐름 (End-to-End)

```text
+-----------------+     multipart POST      +--------------------+   { action:"analyze",     +----------------------+
| /analyze (C33)  | ----------------------> | /api/analyze (C35) |     pdfBase64 }           | collect Edge (C36)   |
| 파일 선택/검증   |                         | 타입·3MB 검증       | ------------------------> | 1 Gemini 구조화 추출  |
| 로딩/에러 상태   | <---------------------- | service_role 프록시 | <------------------------ | 2 household_profile  |
| 결과 렌더 (C34) |     AnalyzeResult JSON  +--------------------+      AnalyzeResult        | 3 evaluate() 판정    |
+-----------------+                                                                          +----------------------+
```

- 프로필은 3단계에서 Edge가 DB에서 직접 조회 — LLM 전달 경로 없음 (BR-U7-3).
- 저장 단계 없음 — 응답 후 폐기 (BR-U7-6).

## 컴포넌트

### C33 AnalyzePage (`/analyze`, 클라이언트)
- 파일 선택(input type=file, accept=application/pdf) → 클라 검증(BR-U7-1) → `POST /api/analyze` (multipart).
- 상태: idle / uploading / done(AnalyzeResult) / error(message). 미저장 — 새로고침 시 초기화.

### C34 AnalyzeResultView (결과 표시)
- `match.perSupplyType[]` → 공급유형별 판정 배지(가능=eligible/조건부=conditional/불가=ineligible, 색+텍스트 병기 NFR-7) + reasons 목록.
- `extracted` 병기 블록: 제목·지역·접수기간·추출 기준(소득/자산/통장/거주 등) — 원문 대조용 (BR-U7-5).
- disclaimer 상시 노출.

### C35 /api/analyze (Next Route Handler, nodejs)
- 입력: multipart form `file`. 검증: mime·크기(BR-U7-1) → 실패 시 400/413.
- collect Edge Function에 `{ action: "analyze", pdfBase64, mimeType }` POST (service_role Bearer — /api/profile의 `functionsBaseUrl()` 패턴 재사용).
- Edge 응답을 그대로 반환. 오류는 BR-U7-8 메시지로 변환. `maxDuration = 60`(Gemini 추출 지연 대비).

### C36 analyzePdf (Edge `collect/analyze.ts`, action="analyze")
1. **extractFromPdf(apiKey, pdfBase64)**: Gemini `generateContent` — parts에 `inline_data{ mime_type, data }` + 스키마 강제 프롬프트, `generationConfig.responseMimeType="application/json"`. → ExtractedNotice (BR-U7-2, 실패 시 오류 코드 반환). summarize.ts의 REST 호출 패턴·모델(gemini-2.0-flash) 재사용.
2. **프로필 조회**: `household_profile` 단일 행 (recommend/service.ts 패턴). 없으면 `profileMissing` 응답 (BR-U7-7).
3. **판정**: ExtractedNotice → 합성 NoticeInput → `evaluate(notice, profile, loadCriteriaTable(), todayKST())` (BR-U7-4).
4. 응답: `{ extracted, match, disclaimer }` (E-U7-3).
- index.ts action 라우팅에 `"analyze"` 분기 추가 (recompute/test-push 선례).

### nav 변경 (U5 BottomNav)
- `TABS`에 `{ href: "/analyze", label: "공고분석", testid: "tab-analyze" }` 추가 (4탭).

## 테스트 대상 (순수 로직)
- ExtractedNotice → 합성 NoticeInput 매핑 (null 처리·공급유형 전달).
- Gemini 응답 JSON 파싱·검증 (isNotice=false, 파싱 실패, 부분 null).
- 파일 검증 규칙 (mime/크기 경계).
