import { describe, it, expect } from "vitest";
import { MAX_PDF_BYTES, validatePdfFile } from "@/features/analyze/validate";

describe("validatePdfFile (BR-U7-1)", () => {
  it("PDF mime — 통과", () => {
    expect(validatePdfFile({ type: "application/pdf", size: 1024, name: "공고.pdf" }).ok).toBe(true);
  });

  it("mime 비어도 확장자 .pdf면 통과 (일부 브라우저 방어)", () => {
    expect(validatePdfFile({ type: "", size: 1024, name: "공고.PDF" }).ok).toBe(true);
  });

  it("PDF 아님 → invalidFile", () => {
    const r = validatePdfFile({ type: "image/png", size: 1024, name: "공고.png" });
    expect(r).toMatchObject({ ok: false, code: "invalidFile" });
  });

  it("크기 경계 — 상한 초과만 tooLarge", () => {
    expect(validatePdfFile({ type: "application/pdf", size: MAX_PDF_BYTES, name: "a.pdf" }).ok).toBe(true);
    const r = validatePdfFile({ type: "application/pdf", size: MAX_PDF_BYTES + 1, name: "a.pdf" });
    expect(r).toMatchObject({ ok: false, code: "tooLarge" });
  });
});
