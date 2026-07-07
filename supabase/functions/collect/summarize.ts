// 자격조건 AI 요약 (U4 사양, U1에서 실행). BR-8: summary 없는 공고만, 1회 상한.
// 키는 서버 전용(NFR-3). 제공자: Google Gemini API (gemini-2.5-flash, GEMINI_MODEL로 교체 가능).

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

const MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
const DEFAULT_LIMIT = 10; // Q-IU3=A

interface NoticeRow {
  id: string;
  title: string;
  supply_type: string | null;
  raw: unknown;
}

/** eligibility_summary가 비어 있는 공고를 상한만큼 요약해 저장한다. 실패는 비차단. */
export async function summarizeMissing(
  client: SupabaseClient,
  limit = DEFAULT_LIMIT,
): Promise<{ summarized: number }> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.warn("GEMINI_API_KEY 미설정 — 요약 건너뜀");
    return { summarized: 0 };
  }

  const { data, error } = await client
    .from("notices")
    .select("id, title, supply_type, raw")
    .is("eligibility_summary", null)
    .limit(limit);
  if (error) throw new Error(`요약 대상 조회 실패: ${error.message}`);

  let summarized = 0;
  for (const row of (data ?? []) as NoticeRow[]) {
    try {
      const summary = await summarizeOne(apiKey, row);
      if (!summary) continue;
      const { error: upErr } = await client
        .from("notices")
        .update({ eligibility_summary: summary })
        .eq("id", row.id);
      if (upErr) {
        console.warn(`요약 저장 실패 ${row.id}: ${upErr.message}`);
        continue;
      }
      summarized++;
    } catch (e) {
      console.warn(`요약 실패 ${row.id}: ${(e as Error).message}`); // 비차단 (BR-8.2)
    }
  }
  return { summarized };
}

async function summarizeOne(apiKey: string, row: NoticeRow): Promise<string | null> {
  const source = JSON.stringify(row.raw ?? {});
  const prompt =
    `다음 청약/임대 공고의 자격조건을 일반 사용자가 "나에게 해당되나요?"를 빠르게 판단할 수 있도록 ` +
    `3~5줄로 쉽게 요약해줘. 신혼부부/예비신혼/소득·자산 기준/거주지 요건이 있으면 명시.\n\n` +
    `제목: ${row.title}\n공급유형: ${row.supply_type ?? "미상"}\n원본: ${source.slice(0, 4000)}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 400, temperature: 0.4 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === "string" && text.trim().length > 0 ? text.trim() : null;
}
