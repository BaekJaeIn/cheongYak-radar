// SH 서울주택도시공사 공고 Collector (source=sh, 크롤링 — 공식 API 없음)
// v9 FR-17.2: 서울주거포털 임대·분양 목록을 정규식으로 파싱(주석 처리된 공고명 링크 회피)하고,
//   공고마다 i-sh.co.kr 상세 본문에서 접수일을 추출해 apply_start/apply_end 보강.
// 임대는 '모집중'만, 분양은 게시 90일 이내만. 항목 단위 실패는 skip + 로그 (BR-6.3).

import { normalize, type RawNotice } from "../normalize.ts";
import type { Collector, NoticeInput } from "../types.ts";
import { htmlToText, parseShApplyPeriod, parseShList, type ShListRow } from "./parsers.ts";

const BASE = "https://housing.seoul.go.kr";
const BOARDS = [
  { kind: "lease", path: "/site/main/sh/publicLease/list" },
  { kind: "sale", path: "/site/main/sh/publicSale/01/list" },
] as const;
const RECRUITING = "모집중";
const SALE_MAX_AGE_DAYS = 90;
const DETAIL_CONCURRENCY = 3;

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

/** 상세 본문 → 접수기간. 실패는 빈 기간(시작일 없음). */
async function fetchApplyPeriod(row: ShListRow): Promise<ReturnType<typeof parseShApplyPeriod>> {
  try {
    const res = await fetch(row.link);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseShApplyPeriod(htmlToText(await res.text()));
  } catch (e) {
    console.warn(`[sh] 상세 skip ${row.seq}: ${(e as Error).message}`);
    return { applyStart: null, applyEnd: null };
  }
}

export class ShCollector implements Collector {
  readonly source = "sh" as const;

  async collect(): Promise<NoticeInput[]> {
    const saleCutoff = daysAgo(SALE_MAX_AGE_DAYS);
    const rows: ShListRow[] = [];
    const seen = new Set<string>();
    for (const board of BOARDS) {
      const res = await fetch(BASE + board.path);
      if (!res.ok) throw new Error(`SH 목록 ${board.kind} ${res.status}`);
      for (const row of parseShList(await res.text())) {
        if (seen.has(row.seq)) continue;
        if (board.kind === "lease" && row.status !== RECRUITING) continue;
        if (board.kind === "sale" && (!row.postedDate || row.postedDate < saleCutoff)) continue;
        seen.add(row.seq);
        rows.push(row);
      }
    }

    const out: NoticeInput[] = [];
    let enriched = 0;
    for (let i = 0; i < rows.length; i += DETAIL_CONCURRENCY) {
      const batch = rows.slice(i, i + DETAIL_CONCURRENCY);
      const periods = await Promise.all(batch.map(fetchApplyPeriod));
      batch.forEach((row, j) => {
        if (periods[j].applyStart) enriched++;
        const raw: RawNotice = {
          source_no: row.seq,
          title: row.title,
          address: "서울특별시", // 공고명엔 단지명(예: 신정도시마을)이 섞여 시군구 오파싱 → 시도만
          supplyType: row.type || row.title,
          notice_date: row.postedDate,
          apply_start: periods[j].applyStart,
          apply_end: periods[j].applyEnd,
          winner_date: row.announceDate,
          url: row.link,
          raw: row,
        };
        const n = normalize(this.source, raw);
        if (n) out.push(n);
      });
    }
    console.log(`[sh] 적재 후보 ${out.length}건, 접수시작일 추출 ${enriched}건`);
    return out;
  }
}
