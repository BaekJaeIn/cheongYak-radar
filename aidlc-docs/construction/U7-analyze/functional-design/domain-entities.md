# U7 공고분석 — 도메인 엔티티 (v4, FR-12)

## E-U7-1 AnalyzeRequest (일시적 — 미저장)
| 필드 | 타입 | 규칙 |
|---|---|---|
| file | PDF 바이너리 | `application/pdf`만, 실효 상한 3MB (C-10) |

## E-U7-2 ExtractedNotice (Gemini 구조화 추출 결과)
공고 메타 + 자격 기준. **원문에 명시된 값만 채우고 없으면 null** (환각 억제, D-2).

| 필드 | 타입 | 설명 |
|---|---|---|
| title | string \| null | 공고 제목 |
| regionSido / regionSigu | string \| null | 공급 위치 (시도/시군구) |
| applyStart / applyEnd | string(YYYY-MM-DD) \| null | 청약 접수 기간 |
| supplyTypes | string[] | 공급유형 (기존 라벨 체계: 신혼부부특별공급·신혼희망타운·생애최초·일반공급 등) |
| eligibility | EligibilityCriteria | **기존 스키마 재사용** (`src/lib/types/notice.ts` = Edge `types.ts` 미러): incomePctLimit·assetLimit·carLimit·residencyReq·savingsReq·preNewlywed·firstTime 등 |
| isNotice | boolean | 청약/입주자모집 공고로 인식되는지 — false면 분석 불가 처리 (BR-U7-2) |

## E-U7-3 AnalyzeResult (응답 — 미저장, FR-12.6)
| 필드 | 타입 | 설명 |
|---|---|---|
| extracted | ExtractedNotice | 원문 대조 검증용 병기 (FR-12.5) |
| match | MatchResult | **기존 U6 타입 재사용**: `perSupplyType: SupplyTypeMatch[]` (type, status: eligible/conditional/ineligible, reasons[]), `anyEligible` |
| disclaimer | string | "참고용 판정 — 최종 판단은 공고 원문 확인" (C-11) |

## 재사용 관계
- `EligibilityCriteria`, `NoticeInput`(합성 입력), `HouseholdProfile`, `CriteriaTable`, `MatchResult`/`SupplyTypeMatch` — 전부 기존 정의 재사용, 신규 영속 엔티티 없음, DB 변경 없음 (§14.3).
- 합성 NoticeInput: `id="analyze:upload"`, ExtractedNotice 필드 매핑 → `evaluate()`가 요구하는 최소 형태.
