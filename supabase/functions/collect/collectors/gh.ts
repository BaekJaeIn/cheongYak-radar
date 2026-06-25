// 경기주택도시공사(GH) 모집공고 Collector (source=gh)
// GH 데이터 출처는 data.go.kr의 GH 오픈API(있을 경우) 또는 odcloud 파일데이터.
// 정확한 엔드포인트/키 방식이 데이터셋마다 달라, URL은 env GH_API_URL 로 주입.
//   예) supabase secrets set GH_API_URL="https://api.odcloud.kr/api/<id>/v1/uddi:..."
// 컬럼명은 다중 후보 매핑(best-effort) + 미설정/실패 시 비차단 skip.

import { normalize, type RawNotice } from "../normalize.ts";
import type { Collector, NoticeInput } from "../types.ts";

const PER_PAGE = 100;
const MAX_PAGES = 5;

function pick(r: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = r[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

export class GhCollector implements Collector {
  readonly source = "gh" as const;

  async collect(): Promise<NoticeInput[]> {
    const key = Deno.env.get("DATA_GO_KR_API_KEY");
    const base = Deno.env.get("GH_API_URL");
    if (!key || !base) {
      console.warn("[gh] skip: DATA_GO_KR_API_KEY 또는 GH_API_URL 미설정");
      return [];
    }

    const out: NoticeInput[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const sep = base.includes("?") ? "&" : "?";
      const url = `${base}${sep}page=${page}&perPage=${PER_PAGE}&serviceKey=${key}`;
      let rows: unknown[] = [];
      try {
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(json?.data)) {
          console.warn(`[gh] skip page ${page}: HTTP ${res.status} ${JSON.stringify(json?.msg ?? json?.code ?? "")}`);
          break;
        }
        rows = json.data as unknown[];
      } catch (e) {
        console.warn(`[gh] skip: ${(e as Error).message}`);
        break;
      }
      if (rows.length === 0) break;

      for (const row of rows) {
        const r = row as Record<string, unknown>;
        const raw: RawNotice = {
          source_no: pick(r, ["공고번호", "공고ID", "번호", "panId", "PAN_ID"]) ?? "",
          title: pick(r, ["공고명", "공고제목", "주택명", "단지명", "사업명"]) ?? "",
          address: pick(r, ["주소", "소재지", "지역", "공급위치", "공급지역", "위치"]),
          areaText: pick(r, ["전용면적", "면적", "공급면적"]),
          supplyType: pick(r, ["공급유형", "주택유형", "임대구분", "공급구분", "유형"]),
          notice_date: pick(r, ["공고일", "게시일", "공고게시일"]),
          apply_start: pick(r, ["접수시작일", "청약접수시작일", "신청시작일"]),
          apply_end: pick(r, ["접수마감일", "청약접수마감일", "신청마감일", "마감일"]),
          url: pick(r, ["상세URL", "URL", "링크", "공고URL"]) ?? "https://apply.gh.or.kr",
          raw: row,
        };
        const n = normalize(this.source, raw);
        if (n) out.push(n);
      }
      if (rows.length < PER_PAGE) break;
    }
    console.log(`[gh] 적재 후보 ${out.length}건(서울·경기 필터 후)`);
    return out;
  }
}
