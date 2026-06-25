// 마이홈 공공임대 단지정보 Collector (보강용, data.go.kr 15110581)
// ⚠️ 엔드포인트 경로 미확정: 현재 추정 URL은 odcloud에서 code -3("등록되지 않은 서비스").
//    실제 "요청주소"를 data.go.kr 15110581 상세에서 확인해 ENDPOINT 교체 필요.
//    그 전까지는 오류 대신 빈 결과 반환(파이프라인 비차단).

import { normalize, type RawNotice } from "../normalize.ts";
import type { Collector, NoticeInput } from "../types.ts";

// TODO(15110581): 실제 요청주소로 교체.
const ENDPOINT =
  "https://api.odcloud.kr/api/MyHomePublicLeaseComplexSvc/v1/getPublicLeaseComplexList";

export class MyhomeComplexCollector implements Collector {
  readonly source = "lh" as const;

  async collect(): Promise<NoticeInput[]> {
    const key = Deno.env.get("DATA_GO_KR_API_KEY");
    if (!key) return []; // 키 없으면 조용히 skip

    const url = `${ENDPOINT}?serviceKey=${key}&page=1&perPage=100`;
    let json: Record<string, unknown>;
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      json = await res.json().catch(() => ({}));
      // odcloud 에러 봉투({code,msg}) 또는 data 누락 → 보강 소스이므로 비차단 skip.
      if (!res.ok || !Array.isArray(json?.data)) {
        console.warn(
          `[myhome-complex] skip: HTTP ${res.status} ${JSON.stringify(json?.msg ?? json?.code ?? "")}`,
        );
        return [];
      }
    } catch (e) {
      console.warn(`[myhome-complex] skip: ${(e as Error).message}`);
      return [];
    }

    const rows = json.data as unknown[];
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
