// LH 분양임대 공고문 Collector (source=lh, data.go.kr 15058530 오픈API)
// 엔드포인트: B552555/lhLeaseNoticeInfo1/lhLeaseNoticeInfo1  → 시크릿 LH_API_URL 로 주입.
//   예) supabase secrets set LH_API_URL="https://apis.data.go.kr/B552555/lhLeaseNoticeInfo1/lhLeaseNoticeInfo1"
// 필수 파라미터: PAN_NT_ST_DT(공고게시일), CLSG_DT(마감일). 페이징: PG_SZ/PAGE.
// 응답은 배열형([{dsSch...},{dsList:[...]}]) → dsList 추출. 403 등 실패 시 비차단 skip(승인 대기 포함).

import { normalize, type RawNotice } from "../normalize.ts";
import { parseRegion } from "../region-alias.ts";
import type { Collector, NoticeInput } from "../types.ts";

const PG_SZ = 100;
const MAX_PAGES = 5;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

function pick(r: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = r[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

// 주택 청약과 무관한 공고 제외(토지·상가·시설 등).
const NON_HOUSING = /토지|상가|용지|점포|주유소|어린이집|창고|물류|공장|단독주택용지|근린생활/;
// 비수도권 지역본부(서울·경기 외) 제외 보조.
const NON_CAPITAL =
  /(부산|대구|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주|인천)\s*지역본부/;

/** YYYYMMDD (오늘 기준 오프셋 일). */
function ymd(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** LH 응답에서 레코드 배열 추출(배열형/객체형 모두 대응). */
function extractRows(json: unknown): unknown[] {
  if (Array.isArray(json)) {
    for (const el of json) {
      if (el && typeof el === "object" && Array.isArray((el as Record<string, unknown>).dsList)) {
        return (el as Record<string, unknown>).dsList as unknown[];
      }
    }
    // dsList 없으면 배열 자체가 레코드일 수도
    return json.filter((e) => e && typeof e === "object" && !("dsSch" in (e as object)));
  }
  const o = json as Record<string, unknown>;
  if (Array.isArray(o?.dsList)) return o.dsList as unknown[];
  if (Array.isArray(o?.data)) return o.data as unknown[];
  const items = (o?.response as any)?.body?.items;
  if (Array.isArray(items)) return items;
  if (Array.isArray(items?.item)) return items.item;
  return [];
}

export class LhCollector implements Collector {
  readonly source = "lh" as const;

  async collect(): Promise<NoticeInput[]> {
    const key = Deno.env.get("DATA_GO_KR_API_KEY");
    const base = Deno.env.get("LH_API_URL") ?? Deno.env.get("LH_FILEDATA_URL");
    if (!key || !base) {
      console.warn("[lh] skip: DATA_GO_KR_API_KEY 또는 LH_API_URL 미설정");
      return [];
    }
    const dateRange = `PAN_NT_ST_DT=${ymd(-180)}&CLSG_DT=${ymd(365)}`;

    const out: NoticeInput[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const sep = base.includes("?") ? "&" : "?";
      const url = `${base}${sep}serviceKey=${key}&PG_SZ=${PG_SZ}&PAGE=${page}&${dateRange}`;
      let rows: unknown[] = [];
      try {
        const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": UA } });
        const text = await res.text();
        if (!res.ok || /Forbidden|errMsg|등록되지|SERVICE_KEY|returnReasonCode/i.test(text)) {
          console.warn(`[lh] skip page ${page}: HTTP ${res.status} ${text.slice(0, 80).replace(/\s+/g, " ")}`);
          break;
        }
        rows = extractRows(JSON.parse(text));
      } catch (e) {
        console.warn(`[lh] skip: ${(e as Error).message}`);
        break;
      }
      if (rows.length === 0) break;

      for (const row of rows) {
        const r = row as Record<string, unknown>;
        // 상위유형(분양/임대) + 세부유형 합성 → KindBadge가 분양/임대 판별.
        const supply = [
          pick(r, ["UPP_AIS_TP_NM", "공급구분", "상위유형"]),
          pick(r, ["AIS_TP_CD_NM", "공급유형", "주택유형"]),
        ].filter(Boolean).join(" ") || null;
        const title = pick(r, ["PAN_NM", "공고명", "공고제목"]) ?? "";
        const cnp = pick(r, ["CNP_CD_NM", "지역명", "공급지역", "주소", "소재지", "LCT_ARA_DTL_ADR"]);

        // 1) 주택 외(토지·상가·시설) 제외
        if (NON_HOUSING.test(`${supply ?? ""} ${title}`)) continue;
        // 2) 비수도권 지역본부 제외(제목 [XX지역본부])
        if (NON_CAPITAL.test(title)) continue;

        // 3) LH는 전국 → 서울·경기로 확정된 것만 (시(市)만 있는 비수도권 드롭).
        const addr = [cnp, title].filter(Boolean).join(" ");
        const sido = parseRegion(addr).sido;
        if (sido !== "서울" && sido !== "경기") continue;

        const raw: RawNotice = {
          source_no: pick(r, ["PAN_ID", "공고ID", "공고번호"]) ?? "",
          title,
          // 지역 파싱 강화: 지역명 + 제목([서울지역본부] 등)을 함께 제공.
          address: addr,
          areaText: pick(r, ["DLT_AR", "전용면적", "면적"]),
          supplyType: supply,
          notice_date: pick(r, ["PAN_NT_ST_DT", "공고게시일", "공고일"]),
          apply_end: pick(r, ["CLSG_DT", "마감일", "접수마감일"]),
          url: pick(r, ["DTL_URL", "상세URL", "URL"]) ?? "https://apply.lh.or.kr",
          raw: row,
        };
        const n = normalize(this.source, raw);
        if (n) out.push(n);
      }
      if (rows.length < PG_SZ) break;
    }
    console.log(`[lh] 적재 후보 ${out.length}건(서울·경기 필터 후)`);
    return out;
  }
}
