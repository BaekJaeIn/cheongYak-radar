// /api/analyze — 공고 PDF 자격판정 프록시 (C35, FR-12). 검증 후 collect Edge action="analyze" 위임.
// service_role은 서버에서만 사용(NFR-3, BR-U7-9). 결과·PDF 미저장 (BR-U7-6).
import { NextResponse } from "next/server";
import { validatePdfFile } from "@/features/analyze/validate";
import { getSessionUser } from "@/lib/supabase/session";
import type { AnalyzeErrorCode, AnalyzeOutcome } from "@/features/analyze/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Gemini PDF 추출 지연 대비 (Vercel 기본 10s로는 부족)

export async function POST(req: Request) {
  try {
    // 판정은 로그인 회원의 프로필로 (v6 FR-14.5, BR-U8-9)
    const user = await getSessionUser();
    if (!user) return fail("edgeError", "로그인이 필요해요.", 401);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return fail("invalidFile", "PDF 파일만 업로드할 수 있어요.", 400);
    }
    const check = validatePdfFile({ type: file.type, size: file.size, name: file.name });
    if (!check.ok) {
      return fail(check.code, check.message, check.code === "tooLarge" ? 413 : 400);
    }

    const base = functionsBaseUrl();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !key) {
      return fail("edgeError", "서버 환경변수 미설정 — 분석을 수행할 수 없어요.", 500);
    }

    const pdfBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const res = await fetch(`${base}/functions/v1/collect`, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ action: "analyze", pdfBase64, mimeType: "application/pdf", userId: user.id }),
    });
    if (!res.ok) {
      return fail("edgeError", "분석 실패 — 잠시 후 다시 시도해 주세요.", 502); // BR-U7-8
    }
    const outcome = (await res.json()) as AnalyzeOutcome;
    return NextResponse.json(outcome);
  } catch (e) {
    console.error("[api/analyze] 실패:", (e as Error).message);
    return fail("edgeError", "분석 실패 — 잠시 후 다시 시도해 주세요.", 500);
  }
}

function fail(code: AnalyzeErrorCode, message: string, status: number) {
  const body: AnalyzeOutcome = { ok: false, code, message };
  return NextResponse.json(body, { status });
}

/** Supabase Functions 베이스 URL 정규화 (/api/profile 패턴). */
function functionsBaseUrl(): string | null {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!url) return null;
  url = url.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
