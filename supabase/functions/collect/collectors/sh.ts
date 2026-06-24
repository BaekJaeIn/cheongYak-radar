// SH 서울주택도시공사 공고 Collector (source=sh, 크롤링 — 공식 API 없음)
// deno-dom으로 목록 HTML 파싱. 항목 단위 실패는 skip + 로그 (BR-6.3).

import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";
import { normalize, type RawNotice } from "../normalize.ts";
import type { Collector, NoticeInput } from "../types.ts";

const LIST_URL = "https://housing.seoul.go.kr/site/main/sh/publicLease/list";
const BASE = "https://housing.seoul.go.kr";

export class ShCollector implements Collector {
  readonly source = "sh" as const;

  async collect(): Promise<NoticeInput[]> {
    const res = await fetch(LIST_URL);
    if (!res.ok) throw new Error(`SH 목록 ${res.status}`);
    const html = await res.text();

    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) throw new Error("SH HTML 파싱 실패");

    const out: NoticeInput[] = [];
    // 셀렉터는 구조 변경에 대비해 한 곳에서 관리 (구조 변경 시 여기만 수정).
    const rows = doc.querySelectorAll("table tbody tr");
    for (const row of Array.from(rows)) {
      try {
        const el = row as unknown as Element;
        const link = el.querySelector("a");
        const title = link?.textContent?.trim();
        const href = link?.getAttribute("href") ?? "";
        const cells = Array.from(el.querySelectorAll("td")).map((c) =>
          (c as unknown as Element).textContent?.trim() ?? "",
        );
        if (!title) continue;

        const idMatch = href.match(/(?:seq|id|no)=([\w-]+)/);
        const source_no = idMatch ? idMatch[1] : `${title}-${cells[0] ?? ""}`;

        const raw: RawNotice = {
          source_no,
          title,
          address: "서울특별시",
          supplyType: title,
          notice_date: cells.find((c) => /\d{4}[-.]\d{2}[-.]\d{2}/.test(c)) ?? null,
          url: href.startsWith("http") ? href : BASE + href,
          raw: { cells, href },
        };
        const n = normalize(this.source, raw);
        if (n) out.push(n);
      } catch (e) {
        console.warn("SH 행 파싱 skip:", (e as Error).message);
      }
    }
    return out;
  }
}
