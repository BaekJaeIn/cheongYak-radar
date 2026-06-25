// 마이홈/LH 임대공고 Collector (source=lh, data.go.kr 15088707 — 파일데이터)
// 파일데이터는 odcloud의 uddi 엔드포인트로 페이징 JSON 제공:
//   https://api.odcloud.kr/api/15088707/v1/uddi:<uuid>?page=&perPage=&serviceKey=
// 정확한 uddi URL은 15088707 상세의 "요청주소"에서 확인 → 시크릿 LH_FILEDATA_URL 로 주입.
// 컬럼명이 파일마다 달라 다중 후보로 매핑(best-effort) + 미설정/실패 시 비차단 skip.

import { normalize, type RawNotice } from "../normalize.ts";
import type { Collector, NoticeInput } from "../types.ts";

const PER_PAGE = 100;
const MAX_PAGES = 5;

/** 후보 키들 중 처음으로 값이 있는 것을 반환(공백 제거). */
function pick(r: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = r[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

export class LhCollector implements Collector {
  readonly source = "lh" as const;

  async collect(): Promise<NoticeInput[]> {
    const key = Deno.env.get("DATA_GO_KR_API_KEY");
    const base = Deno.env.get("LH_FILEDATA_URL"); // uddi 엔드포인트(쿼리 제외)
    if (!key || !base) {
      console.warn("[lh] skip: DATA_GO_KR_API_KEY 또는 LH_FILEDATA_URL 미설정");
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
          console.warn(`[lh] skip page ${page}: HTTP ${res.status} ${JSON.stringify(json?.msg ?? json?.code ?? "")}`);
          break;
        }
        rows = json.data as unknown[];
      } catch (e) {
        console.warn(`[lh] skip: ${(e as Error).message}`);
        break;
      }
      if (rows.length === 0) break;

      for (const row of rows) {
        const r = row as Record<string, unknown>;
        const raw: RawNotice = {
          source_no: pick(r, ["공고번호", "PAN_ID", "panId", "번호", "공고ID"]) ?? "",
          title: pick(r, ["공고명", "공고제목", "PAN_NM", "panNm", "주택명", "단지명"]) ?? "",
          address: pick(r, ["주소", "소재지", "지역", "공급위치", "공급지역", "CNP_CD_NM", "splyAdres"]),
          areaText: pick(r, ["전용면적", "면적", "EXCLUSE_AR"]),
          supplyType: pick(r, ["공급유형", "주택유형", "임대구분", "유형", "AIS_TP_CD_NM", "rentType"]),
          notice_date: pick(r, ["공고일", "게시일", "공고게시일", "PAN_NT_ST_DT"]),
          apply_start: pick(r, ["접수시작일", "청약접수시작일", "신청시작일"]),
          apply_end: pick(r, ["접수마감일", "청약접수마감일", "신청마감일", "마감일", "CLSG_DT", "rceptEndDe"]),
          url: pick(r, ["상세URL", "상세주소", "URL", "DTL_URL", "링크"]) ?? "https://www.myhome.go.kr",
          raw: row,
        };
        const n = normalize(this.source, raw);
        if (n) out.push(n);
      }
      if (rows.length < PER_PAGE) break;
    }
    console.log(`[lh] 적재 후보 ${out.length}건(서울·경기 필터 후)`);
    return out;
  }
}
