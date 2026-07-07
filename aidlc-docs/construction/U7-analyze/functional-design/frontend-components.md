# U7 공고분석 — 프론트엔드 컴포넌트 (v4, FR-12)

## 계층

```text
/analyze (page)
+-- AnalyzePage (client, C33)
    +-- UploadBox        : 파일 선택 + 안내(3MB·PDF만) + 분석 버튼
    +-- AnalyzeStatus    : uploading 스피너 / error 메시지(+재시도)
    +-- AnalyzeResultView (C34)
        +-- VerdictCard(공급유형별) : 배지(가능/조건부/불가) + 사유 목록
        +-- ExtractedBlock          : 추출된 공고 메타·기준 병기 (원문 대조용)
        +-- Disclaimer              : 참고용 고지 (상시)
```

## 상태·상호작용 (C33)
| 상태 | 화면 | 전이 |
|---|---|---|
| idle | UploadBox만 | 파일 선택·검증 통과 → uploading |
| uploading | 버튼 비활성 + 스피너 | 응답 성공 → done / 실패 → error |
| done | 결과 렌더 + "다른 공고 분석" 버튼 | 재업로드 → uploading |
| error | 메시지 + 재시도 | BR-U7-7이면 프로필 탭 링크 병기 |

- 클라 검증: `file.type !== "application/pdf"` 또는 `file.size > 3MB` → 업로드 없이 즉시 안내 (BR-U7-1).
- API: `POST /api/analyze` (multipart FormData `file`). 응답 `AnalyzeResult` 또는 `{ error, code? }`.

## 표시 규칙
- 배지 색+텍스트 병기(NFR-7): 가능=green, 조건부=amber, 불가=gray/red — 기존 자격 배지 스타일(U3/U4) 재사용.
- ExtractedBlock: null 필드는 "공고에서 확인 불가"로 표기(추측값 없음을 명시, D-2).
- data-testid: `analyze-upload-input`, `analyze-submit-button`, `analyze-result`, `tab-analyze` (automation 규칙).
- 모바일 우선(max-w-md 레이아웃 기존 패턴), PWA 내 동작 — 파일 선택은 Android 시스템 파일 피커 사용.
