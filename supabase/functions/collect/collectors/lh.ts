// 마이홈포털 LH 임대공고 Collector (source=lh, data.go.kr 15088707)

import { normalize, type RawNotice } from "../normalize.ts";
import type { Collector, NoticeInput } from "../types.ts";

const ENDPOINT = "https://api.odcloud.kr/api/MyHomeLhRentNoticeSvc/v1/getLhRentNoticeList";

export class LhCollector implements Collector {
  readonly source = "lh" as const;

  async collect(): Promise<NoticeInput[]> {
    const key = Deno.env.get("DATA_GO_KR_API_KEY");
    if (!key) throw new Error("DATA_GO_KR_API_KEY 미설정");

    const url = `${ENDPOINT}?serviceKey=${encodeURIComponent(key)}&page=1&perPage=100`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`LH API ${res.status}`);
    const json = await res.json();

    const rows: unknown[] = json?.data ?? [];
    const out: NoticeInput[] = [];
    for (const row of rows) {
      const r = row as Record<string, string>;
      const raw: RawNotice = {
        source_no: r["PAN_ID"] ?? r["panId"] ?? "",
        title: r["PAN_NM"] ?? r["panNm"] ?? "",
        address: r["CNP_CD_NM"] ?? r["splyAdres"],
        areaText: r["EXCLUSE_AR"] ?? "",
        supplyType: r["AIS_TP_CD_NM"] ?? r["rentType"],
        notice_date: r["PAN_NT_ST_DT"] ?? null,
        apply_end: r["CLSG_DT"] ?? r["rceptEndDe"] ?? null,
        url: r["DTL_URL"] ?? "https://www.myhome.go.kr",
        raw: row,
      };
      const n = normalize(this.source, raw);
      if (n) out.push(n);
    }
    return out;
  }
}
