// U7 공고분석 — PDF 파일 검증 (BR-U7-1, 순수). 클라이언트·서버(/api/analyze) 공용.
export const MAX_PDF_BYTES = 3 * 1024 * 1024; // C-10: Vercel 4.5MB 바디 한도 내 실효 상한

export type FileCheck =
  | { ok: true }
  | { ok: false; code: "invalidFile" | "tooLarge"; message: string };

/** mime 또는 확장자로 PDF 여부·크기 검증. File 객체와 무관한 형태(서버 재사용). */
export function validatePdfFile(f: { type: string; size: number; name: string }): FileCheck {
  const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return { ok: false, code: "invalidFile", message: "PDF 파일만 업로드할 수 있어요." };
  }
  if (f.size > MAX_PDF_BYTES) {
    return { ok: false, code: "tooLarge", message: "3MB 이하 PDF만 분석할 수 있어요." };
  }
  return { ok: true };
}
