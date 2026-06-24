// 청약홈 분양정보 Collector (source=apt, data.go.kr 15098547)
// 매핑은 잠정(source-mapping.md). live 전환 시 실제 필드명 확정 필요.

import { normalize, type RawNotice } from "../normalize.ts";
import type { Collector, NoticeInput } from "../types.ts";

const ENDPOINT =
  "https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail";

export class ApplyHomeCollector implements Collector {
  readonly source = "apt" as const;

  async collect(): Promise<NoticeInput[]> {
    const key = Deno.env.get("DATA_GO_KR_API_KEY");
    if (!key) throw new Error("DATA_GO_KR_API_KEY 미설정");

    const url = `${ENDPOINT}?serviceKey=${encodeURIComponent(key)}&page=1&perPage=100`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`청약홈 API ${res.status}`);
    const json = await res.json();

    const rows: unknown[] = json?.data ?? [];
    const out: NoticeInput[] = [];
    for (const row of rows) {
      const r = row as Record<string, string>;
      const raw: RawNotice = {
        source_no: r["PBLANC_NO"] ?? r["pblancNo"] ?? "",
        title: r["HOUSE_NM"] ?? r["houseNm"] ?? "",
        address: r["HSSPLY_ADRES"] ?? r["supplyLocation"] ?? r["SUBSCRPT_AREA_CODE_NM"],
        areaText: r["HOUSE_DTL_SECD_NM"] ?? r["exclusiveArea"],
        supplyType: r["HOUSE_SECD_NM"] ?? r["RENT_SECD_NM"],
        priorityText: r["RANK"] ?? "",
        notice_date: r["RCRIT_PBLANC_DE"] ?? null,
        apply_start: r["SUBSCRPT_RCEPT_BGNDE"] ?? null,
        apply_end: r["SUBSCRPT_RCEPT_ENDDE"] ?? null,
        winner_date: r["PRZWNER_PRESNATN_DE"] ?? null,
        url: r["PBLANC_URL"] ?? "https://www.applyhome.co.kr",
        raw: row,
      };
      const n = normalize(this.source, raw);
      if (n) out.push(n);
    }
    return out;
  }
}
