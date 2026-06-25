// 청약홈 분양정보 Collector (source=apt, data.go.kr 15098547)
// 필드명은 실제 응답(getAPTLttotPblancDetail)으로 확정. serviceKey는 Decoding 키 그대로(인코딩 X).
// 정렬 최신순 → 앞 페이지가 최근 공고. 전국 수신 후 normalize가 서울·경기 외 드롭(C-6).

import { normalize, type RawNotice } from "../normalize.ts";
import type { Collector, NoticeInput } from "../types.ts";

const ENDPOINT =
  "https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail";
const PER_PAGE = 100;
const MAX_PAGES = 3; // 최근 ~300건(전국) 스캔 → 서울·경기 충분히 포함

/** 빈 문자열/공백 → null (date 컬럼 안전). */
function nz(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

export class ApplyHomeCollector implements Collector {
  readonly source = "apt" as const;

  async collect(): Promise<NoticeInput[]> {
    const key = Deno.env.get("DATA_GO_KR_API_KEY");
    if (!key) throw new Error("DATA_GO_KR_API_KEY 미설정");

    const out: NoticeInput[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url =
        `${ENDPOINT}?serviceKey=${key}&page=${page}&perPage=${PER_PAGE}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`청약홈 API ${res.status}`);
      const json = await res.json();
      const rows: unknown[] = Array.isArray(json?.data) ? json.data : [];
      if (rows.length === 0) break;

      for (const row of rows) {
        const r = row as Record<string, unknown>;

        // 지역 사전 필터(서울·경기만) — normalize가 최종 게이트지만 비용 절감.
        const areaNm = String(r["SUBSCRPT_AREA_CODE_NM"] ?? "");
        if (areaNm && !/서울|경기/.test(areaNm)) continue;

        const raw: RawNotice = {
          source_no: String(r["PBLANC_NO"] ?? ""),
          title: String(r["HOUSE_NM"] ?? "").trim(),
          address: nz(r["HSSPLY_ADRES"]) ?? areaNm,
          // 이 엔드포인트엔 전용면적 필드 없음 → null (모델상세 API는 별도).
          areaText: null,
          // 분양/임대 구분 + 국민/민영 구분을 합쳐 표기.
          supplyType: [nz(r["RENT_SECD_NM"]), nz(r["HOUSE_DTL_SECD_NM"])]
            .filter(Boolean).join(" ") || null,
          notice_date: nz(r["RCRIT_PBLANC_DE"]),
          // 접수 시작: 특별공급 시작 우선(있으면), 없으면 일반 접수 시작.
          apply_start: nz(r["SPSPLY_RCEPT_BGNDE"]) ?? nz(r["RCEPT_BGNDE"]),
          apply_end: nz(r["RCEPT_ENDDE"]),
          winner_date: nz(r["PRZWNER_PRESNATN_DE"]),
          url: nz(r["PBLANC_URL"]) ?? "https://www.applyhome.co.kr",
          raw: row,
        };
        const n = normalize(this.source, raw);
        if (n) out.push(n);
      }
      if (rows.length < PER_PAGE) break; // 마지막 페이지
    }
    return out;
  }
}
