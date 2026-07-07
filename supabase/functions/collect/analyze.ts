// U7 공고분석 — PDF 추출·자격판정 (C36, FR-12). index.ts action="analyze"가 호출.
// BR-U7-2: JSON 강제·없는 값 null / BR-U7-3: 프로필은 LLM 미전송 / BR-U7-4: evaluate 재사용
// BR-U7-6: 미저장(요청 처리 후 폐기) / BR-U7-8: 오류는 코드·메시지로 구조화.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { EligibilityCriteria, NoticeInput } from "./types.ts";
import { evaluate, todayKST } from "./recommend/matcher.ts";
import { loadCriteriaTable } from "./recommend/criteria-2026.ts";
import type { HouseholdProfile, MatchResult } from "./recommend/types.ts";

// Deno.env는 함수 안에서만 접근 — 순수 함수(parseExtracted 등)를 Node(vitest)에서도 import 가능하게.
function model(): string {
  return Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash";
}
const DISCLAIMER = "참고용 판정입니다 — 최종 판단은 반드시 공고 원문을 확인하세요.";

/** Gemini 구조화 추출 결과 (E-U7-2). 원문에 없는 값은 null (D-2). */
export interface ExtractedNotice {
  isNotice: boolean;
  title: string | null;
  regionSido: string | null;
  regionSigu: string | null;
  applyStart: string | null;
  applyEnd: string | null;
  supplyTypes: string[];
  eligibility: EligibilityCriteria;
}

export type AnalyzeErrorCode =
  | "notAnnouncement"
  | "extractFailed"
  | "profileMissing"
  | "geminiUnavailable";

/** 분석 응답 (E-U7-3). 저장하지 않는다 (BR-U7-6). */
export type AnalyzeOutcome =
  | { ok: true; extracted: ExtractedNotice; match: MatchResult; disclaimer: string }
  | { ok: false; code: AnalyzeErrorCode; message: string };

const SUPPLY_TYPE_LABELS =
  "신혼부부특별공급, 신혼부부, 신혼희망타운, 생애최초, 일반공급, 무순위, 행복주택, 국민임대, 영구임대, 장기전세, 민간임대, 청년, 다자녀, 노부모부양";

const PROMPT = `첨부된 PDF가 한국 주택 청약/입주자모집 공고문인지 판단하고, 공고문이면 자격 기준을 추출해 아래 JSON 스키마로만 응답해.
규칙:
- 문서에 명시되지 않은 값은 반드시 null. 절대 추측하지 마.
- supplyTypes는 다음 라벨만 사용: ${SUPPLY_TYPE_LABELS}
- 금액은 원 단위 정수(예: 3억7천만원 → 370000000), 기간은 개월 수.
- 공고문이 아니면 isNotice=false로만 응답.
스키마:
{
  "isNotice": boolean,
  "title": string|null,
  "regionSido": string|null,  // 시/도 (예: "서울", "경기")
  "regionSigu": string|null,  // 시/군/구
  "applyStart": string|null,  // 청약 접수 시작일 YYYY-MM-DD
  "applyEnd": string|null,    // 청약 접수 마감일 YYYY-MM-DD
  "supplyTypes": string[],
  "eligibility": {
    "incomePctLimit": number|null,  // 도시근로자 월평균소득 대비 한도 %
    "assetLimit": number|null,      // 총자산 한도(원)
    "carLimit": number|null,        // 자동차가액 한도(원)
    "residencyReq": {"region": string, "months": number}|null,
    "savingsReq": {"months": number, "count": number}|null,
    "preNewlywedAllowed": boolean|null,  // 예비신혼부부 신청 가능 여부
    "firstTimeEligible": boolean|null    // 생애최초 공급 포함 여부
  }
}`;

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}
function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}
function bool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

/** Gemini 응답 텍스트 → ExtractedNotice. 파싱/형식 불량이면 null. (순수, 테스트 대상) */
export function parseExtracted(text: string): ExtractedNotice | null {
  // 방어: responseMimeType=json이어도 코드펜스가 섞이는 경우 제거
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  let raw: unknown;
  try {
    raw = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.isNotice !== "boolean") return null;

  const supplyTypes = Array.isArray(o.supplyTypes)
    ? o.supplyTypes.filter((t): t is string => typeof t === "string" && t.length > 0)
    : [];
  const e = (typeof o.eligibility === "object" && o.eligibility !== null
    ? o.eligibility
    : {}) as Record<string, unknown>;
  const residency = (typeof e.residencyReq === "object" && e.residencyReq !== null
    ? e.residencyReq
    : null) as Record<string, unknown> | null;
  const savings = (typeof e.savingsReq === "object" && e.savingsReq !== null
    ? e.savingsReq
    : null) as Record<string, unknown> | null;

  const eligibility: EligibilityCriteria = {
    supplyTypes,
    incomePctLimit: num(e.incomePctLimit),
    assetLimit: num(e.assetLimit),
    carLimit: num(e.carLimit),
    residencyReq:
      residency && str(residency.region) && num(residency.months) !== undefined
        ? { region: str(residency.region)!, months: num(residency.months)! }
        : undefined,
    savingsReq:
      savings && num(savings.months) !== undefined && num(savings.count) !== undefined
        ? { months: num(savings.months)!, count: num(savings.count)! }
        : undefined,
    preNewlywedAllowed: bool(e.preNewlywedAllowed),
    firstTimeEligible: bool(e.firstTimeEligible),
  };

  return {
    isNotice: o.isNotice,
    title: str(o.title),
    regionSido: str(o.regionSido),
    regionSigu: str(o.regionSigu),
    applyStart: str(o.applyStart),
    applyEnd: str(o.applyEnd),
    supplyTypes,
    eligibility,
  };
}

/** ExtractedNotice → 합성 NoticeInput. evaluate() 입력용 (D-3, 순수, 테스트 대상). */
export function toNoticeInput(ex: ExtractedNotice): NoticeInput {
  const newlywed = ex.supplyTypes.some((t) => /신혼/.test(t));
  return {
    id: "analyze:upload",
    source_no: "upload",
    source: "private",
    title: ex.title ?? "업로드한 공고",
    region_sido: ex.regionSido,
    region_sigu: ex.regionSigu,
    area_min: null,
    area_max: null,
    notice_date: null,
    apply_start: ex.applyStart,
    apply_end: ex.applyEnd,
    winner_date: null,
    supply_type: ex.supplyTypes[0] ?? null,
    newlywed,
    pre_newlywed: ex.eligibility.preNewlywedAllowed ?? false,
    priority: null,
    url: null,
    eligibility: ex.eligibility,
    raw: null,
  };
}

async function extractFromPdf(
  apiKey: string,
  pdfBase64: string,
  mimeType: string,
): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model()}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mimeType, data: pdfBase64 } },
            { text: PROMPT },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === "string" && text.trim().length > 0 ? text : null;
}

/** PDF 업로드 1건 분석: 추출 → 프로필 조회 → 판정. (C36) */
export async function analyzePdf(
  client: SupabaseClient,
  pdfBase64: string,
  mimeType: string,
): Promise<AnalyzeOutcome> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return { ok: false, code: "geminiUnavailable", message: "분석 서비스가 설정되지 않았어요." };
  }

  let text: string | null;
  try {
    text = await extractFromPdf(apiKey, pdfBase64, mimeType);
  } catch (e) {
    console.warn(`[analyze] Gemini 호출 실패: ${(e as Error).message}`);
    return { ok: false, code: "geminiUnavailable", message: "분석 실패 — 잠시 후 다시 시도해 주세요." };
  }
  const extracted = text ? parseExtracted(text) : null;
  if (!extracted) {
    return { ok: false, code: "extractFailed", message: "공고 내용을 읽지 못했어요. 다른 PDF로 다시 시도해 주세요." };
  }
  if (!extracted.isNotice) {
    return { ok: false, code: "notAnnouncement", message: "청약 공고 PDF로 인식되지 않았어요." };
  }

  const { data: profRow, error: profErr } = await client
    .from("household_profile")
    .select("profile")
    .eq("id", 1)
    .maybeSingle();
  if (profErr) throw new Error(`프로필 조회 실패: ${profErr.message}`);
  if (!profRow?.profile) {
    return { ok: false, code: "profileMissing", message: "내 프로필에서 가구 정보를 먼저 입력해 주세요." };
  }
  const profile = profRow.profile as HouseholdProfile;

  const today = todayKST();
  const table = loadCriteriaTable(new Date(today).getFullYear());
  const match = evaluate(toNoticeInput(extracted), profile, table, today);
  return { ok: true, extracted, match, disclaimer: DISCLAIMER };
}
