// Edge Function: collect — 수집 파이프라인 진입점 (S1 CollectionService)
// 흐름: 모드결정 → allSettled 수집 → upsert → 요약 → push 트리거 → 로깅 (BR-U1-6~10, US-1.1)

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { Collector, NoticeInput, SourceType } from "./types.ts";
import { getMockNotices } from "./mock.ts";
import { ApplyHomeCollector } from "./collectors/apply-home.ts";
import { LhCollector } from "./collectors/lh.ts";
import { MyhomeComplexCollector } from "./collectors/myhome-complex.ts";
import { ShCollector } from "./collectors/sh.ts";
import { upsertNotices } from "./upsert.ts";
import { summarizeMissing } from "./summarize.ts";
import { recompute, type RecomputeResult } from "./recommend/service.ts";
import { dispatch } from "./push.ts";

interface SourceStat {
  source: string;
  count: number;
  error?: string;
}
interface CollectionResult {
  mode: "mock" | "live";
  perSource: SourceStat[];
  inserted: number;
  updated: number;
  summarized: number;
  newIds: string[];
  recommend?: RecomputeResult; // U6 재계산 결과
}

function serviceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
}

function isMockMode(): boolean {
  const mode = Deno.env.get("COLLECT_MODE");
  if (mode === "live") return false;
  if (mode === "mock") return true;
  return !Deno.env.get("DATA_GO_KR_API_KEY"); // 키 없으면 mock (US-1.7)
}

function liveCollectors(): Collector[] {
  return [
    new ApplyHomeCollector(),
    new LhCollector(),
    new MyhomeComplexCollector(),
    new ShCollector(),
  ];
}

async function collectAll(): Promise<{ notices: NoticeInput[]; perSource: SourceStat[]; mode: "mock" | "live" }> {
  if (isMockMode()) {
    const notices = getMockNotices();
    return {
      notices,
      mode: "mock",
      perSource: [{ source: "mock", count: notices.length }],
    };
  }

  const collectors = liveCollectors();
  const settled = await Promise.allSettled(collectors.map((c) => c.collect()));
  const notices: NoticeInput[] = [];
  const perSource: SourceStat[] = [];
  settled.forEach((r, i) => {
    const source = collectors[i].source as SourceType;
    if (r.status === "fulfilled") {
      notices.push(...r.value);
      perSource.push({ source, count: r.value.length });
    } else {
      // 에러 격리 (BR-6): 해당 소스만 실패, 나머지 계속
      perSource.push({ source, count: 0, error: String(r.reason?.message ?? r.reason) });
    }
  });
  return { notices, perSource, mode: "live" };
}

export async function run(): Promise<CollectionResult> {
  const client = serviceClient();

  const { notices, perSource, mode } = await collectAll();
  const { inserted, updated } = await upsertNotices(client, notices);
  const { summarized } = await summarizeMissing(client);

  // U6 재계산: 수집 후 자격·점수 갱신 → 신규 추천 산출 (BR-U6-13a)
  const rec = await recompute(client);

  // U5 연계: **신규 추천** 공고 푸시 (US-6.7, BR-U6-15)
  if (rec.newIds.length > 0) {
    await triggerPush(client, rec.newIds);
  }

  const result: CollectionResult = {
    mode,
    perSource,
    inserted: inserted.length,
    updated: updated.length,
    summarized,
    newIds: inserted,
    recommend: rec,
  };
  console.log("[collect] result:", JSON.stringify(result)); // BR-10
  return result;
}

/** 프로필 변경 등으로 재계산만 수행 (수집 생략). Route Handler가 호출. (US-6.2) */
export async function runRecomputeOnly(): Promise<RecomputeResult> {
  const client = serviceClient();
  const rec = await recompute(client);
  if (rec.newIds.length > 0) await triggerPush(client, rec.newIds);
  console.log("[collect] recompute-only:", JSON.stringify(rec));
  return rec;
}

/** U5 PushDispatcher — 신규 추천 Web Push 발송 (US-6.7). */
async function triggerPush(client: SupabaseClient, newIds: string[]): Promise<void> {
  const r = await dispatch(client, newIds);
  console.log(`[collect] push 신규 추천 ${newIds.length}건 → sent=${r.sent} failed=${r.failed}`);
}

Deno.serve(async (req: Request) => {
  try {
    // { action: "recompute" } → 수집 생략, 재계산만 (프로필 변경 트리거)
    let action: string | undefined;
    if (req.method === "POST") {
      action = await req.json().then((b) => b?.action).catch(() => undefined);
    }
    const result = action === "recompute" ? await runRecomputeOnly() : await run();
    return new Response(JSON.stringify(result), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error("[collect] 실패:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
