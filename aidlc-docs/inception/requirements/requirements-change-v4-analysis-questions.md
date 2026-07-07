# v4 변경요청 확인 질문 — 공고분석 탭 (PDF 자격판정)

**요청 요약**: 새 "공고분석" 탭에서 원하는 공고의 PDF를 업로드하면 가구 프로필 기준으로 지원 가능 여부를 알려준다.

**전제(기존 자산 재사용)**: Gemini(서버 키)로 PDF에서 자격 기준을 구조화 추출 → 기존 EligibilityMatcher + criteria-2026 config로 판정. 결과는 참고용 고지 병기.

각 질문의 [Answer]: 태그 뒤에 선택지 문자를 기입해 주세요.

## Question 1

PDF 입력 처리 방식은 무엇으로 할까요? (Vercel 서버 요청 크기 제한 ~4.5MB 고려)

A) PDF를 서버 API로 전송 → Gemini에 PDF 직접 전달 (추천: 스캔본도 처리 가능, 구현 단순. 단 대략 3MB 초과 PDF는 크기 초과 안내)

B) 브라우저에서 pdf.js로 텍스트만 추출해 서버로 전송 (대용량 PDF 가능, 스캔본(이미지) 불가)

C) 하이브리드 — 기본은 A, 크기 초과 시 B로 폴백 (가장 유연, 구현 비용 최대)

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2

자격 판정 방식은 무엇으로 할까요?

A) 하이브리드 (추천): Gemini는 PDF에서 기준(소득/자산/통장/거주요건 등)만 구조화 추출 → 판정은 기존 EligibilityMatcher가 수행. 소득·자산 등 프로필은 LLM에 전송되지 않음. 추출 기준을 화면에 병기해 원문 대조 가능

B) LLM 직접 판정: PDF + 가구 프로필을 Gemini에 보내 판정·설명 생성 (유연하지만 프로필 외부 전송 + 환각 위험)

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3

분석 결과는 어떻게 다룰까요?

A) 화면 표시만, 저장 안 함 (추천: 단순. 필요하면 나중에 이력 추가 가능)

B) 분석 이력을 DB에 저장하고 최근 분석 목록 제공

C) Other (please describe after [Answer]: tag below)

[Answer]: A
