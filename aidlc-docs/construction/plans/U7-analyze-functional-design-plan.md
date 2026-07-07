# U7 공고분석 — Functional Design Plan (v4)

**변경요청**: v4 (공고분석 탭: PDF 자격판정) — requirements.md §14 FR-12
**단위**: U7 공고분석 (신규 소단위). 의존: U6 recommend 모듈(matcher·criteria config·types), U2 도메인 타입, U5 nav.

**질문 없음**: 핵심 모호점(입력 처리·판정 방식·저장 여부)은 요구사항 단계 Q1~Q3에서 확정(전부 A). 잔여 결정은 기술적 사항으로 코드베이스 분석으로 해소 — D-1(실행 위치) 참조.

## 설계 결정
- **D-1 실행 위치**: 추출·판정은 **collect Edge Function의 신규 action `"analyze"`** 로 실행. 근거: (1) GEMINI_API_KEY가 이미 Edge 환경에만 존재(NFR-3, 신규 env 불요), (2) EligibilityMatcher가 Edge 모듈로 존재 — tsconfig가 `supabase/functions`를 exclude하므로 src에서 직접 import 불가, 미러 시 이중화 위험, (3) `{ action: "recompute" }` 프록시 선례(/api/profile). Next `/api/analyze`는 검증·인증 프록시만 담당.
- **D-2 추출 스키마**: Gemini 응답을 JSON 강제(responseMimeType application/json) — 기존 `EligibilityCriteria` + 공고 메타(제목·지역·접수일·공급유형)로 구성. 원문에 없는 값은 null(환각 억제).
- **D-3 판정 재사용**: 추출 결과로 합성 `NoticeInput`을 만들어 기존 `evaluate()` 호출 — `MatchResult.perSupplyType[]`(status+reasons)를 그대로 결과 UI에 사용. scorer(점수화)는 단건 판정에 불필요 — 미사용.

## Steps
- [x] Step 1: domain-entities.md — AnalyzeRequest/ExtractedNotice/AnalyzeResult, 기존 타입 재사용 관계
- [x] Step 2: business-rules.md — BR-U7-1~8 (크기·타입 검증, JSON 추출 규칙, 프로필 비전송, matcher 재사용, 병기·고지, 미저장, 프로필 부재, 오류 처리)
- [x] Step 3: business-logic-model.md — C33~C36 컴포넌트·흐름(클라 업로드 → /api/analyze 프록시 → Edge analyze → 결과), nav 탭 추가
- [x] Step 4: frontend-components.md — /analyze 화면 계층·상태·상호작용
