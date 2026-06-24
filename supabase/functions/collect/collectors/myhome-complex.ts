// 마이홈 공공임대 단지정보 Collector (보강용, data.go.kr 15110581)
// 독립 공고가 아니라 단지 메타. 매칭 가능 시 LH 공고 보완. 현재는 단지를 lh 보조 레코드로 적재.

import { normalize, type RawNotice } from "../normalize.ts";
import type { Collector, NoticeInput } from "../types.ts";

const ENDPOINT =
  "https://api.odcloud.kr/api/MyHomePublicLeaseComplexSvc/v1/getPublicLeaseComplexList";

export class MyhomeComplexCollector implements Collector {
  readonly source = "lh" as const;

  async collect(): Promise<NoticeInput[]> {
    const key = Deno.env.get("DATA_GO_KR_API_KEY");
    if (!key) throw new Error("DATA_GO_KR_API_KEY 미설정");

    // 관심 시군구 코드 파라미터는 live 전환 시 보강.
    const url = `${ENDPOINT}?serviceKey=${encodeURIComponent(key)}&page=1&perPage=100`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`단지정보 API ${res.status}`);
    const json = await res.json();

    const rows: unknown[] = json?.data ?? [];
    const out: NoticeInput[] = [];
    for (const row of rows) {
      const r = row as Record<string, string>;
      const raw: RawNotice = {
        source_no: `CPX${r["CMPLX_NO"] ?? r["complexNo"] ?? ""}`,
        title: r["CMPLX_NM"] ?? r["complexNm"] ?? "",
        address: r["ADRES"] ?? r["address"],
        areaText: r["EXCLUSE_AR"] ?? "",
        supplyType: r["RENT_SE_NM"] ?? "공공임대",
        url: "https://www.myhome.go.kr",
        raw: row,
      };
      const n = normalize(this.source, raw);
      if (n) out.push(n);
    }
    return out;
  }
}
