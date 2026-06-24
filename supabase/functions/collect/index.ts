// Edge Function: collect — 수집 파이프라인 진입점 (S1 CollectionService)
// 흐름: 모드결정 → allSettled 수집 → upsert → 요약 → push 트리거 → 로깅 (BR-U1-6~10, US-1.1)

import { createClient } from "jsr:@supabase/supabase-js@2";
import type { Collector, NoticeInput, SourceType } from "./types.ts";
import { getMockNotices } from "./mock.ts";
import { ApplyHomeCollector } from "./collectors/apply-home.ts";
import { LhCollector } from "./collectors/lh.ts";
import { MyhomeComplexCollector } from "./collectors/myhome-complex.ts";
import { ShCollector } from "./collectors/sh.ts";
import { upsertNotices } from "./upsert.ts";
import { summarizeMissing } from "./summarize.ts";

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
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const client = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  const { notices, perSource, mode } = await collectAll();
  const { inserted, updated } = await upsertNotices(client, notices);
  const { summarized } = await summarizeMissing(client);

  // U5 연계: 신규 공고 푸시 트리거 (PushDispatcher는 U5에서 구현)
  if (inserted.length > 0) {
    await triggerPush(client, inserted);
  }

  const result: CollectionResult = {
    mode,
    perSource,
    inserted: inserted.length,
    updated: updated.length,
    summarized,
    newIds: inserted,
  };
  console.log("[collect] result:", JSON.stringify(result)); // BR-10
  return result;
}

/** U5 PushDispatcher 연계 지점(인터페이스). U5 구현 전까지는 no-op 로그. */
async function triggerPush(_client: unknown, newIds: string[]): Promise<void> {
  // TODO(U5): PushDispatcher.dispatchForNew(newIds)
  console.log(`[collect] push 대상 신규 ${newIds.length}건 (U5 구현 예정)`);
}

Deno.serve(async (_req: Request) => {
  try {
    const result = await run();
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
