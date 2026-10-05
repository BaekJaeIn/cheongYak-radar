// 경기주택도시공사(GH) 모집공고 Collector (source=gh, 크롤링)
// v9 FR-17.3: 기존 odcloud 데이터셋(GH_API_URL)엔 접수시작일이 없어 GH 주택청약·임대센터 메인 카드로 교체.
//   카드의 "신청기간 YYYY-MM-DD ~ YYYY-MM-DD" → apply_start/apply_end. 상가 유형 제외.
//   메인은 최근 공고만 노출. 대기열(NetFunnel) 활성 시 우회하지 않고 이번 회차 skip.

import { normalize, type RawNotice } from "../normalize.ts";
import type { Collector, NoticeInput } from "../types.ts";
import { ghDetailUrl, ghNetFunnelActive, parseGhCards } from "./parsers.ts";

const MAIN_URL = "https://apply.gh.or.kr/co/coa/selectMainView.do";

export class GhCollector implements Collector {
  readonly source = "gh" as const;

  async collect(): Promise<NoticeInput[]> {
    const res = await fetch(MAIN_URL);
    if (!res.ok) throw new Error(`GH 메인 ${res.status}`);
    const html = await res.text();
    if (ghNetFunnelActive(html)) {
      console.warn("[gh] skip: 대기열(NetFunnel) 활성");
      return [];
    }

    const out: NoticeInput[] = [];
    for (const card of parseGhCards(html)) {
      const raw: RawNotice = {
        source_no: card.pbancNo,
        title: card.title,
        address: `경기도 ${card.title}`, // GH는 경기도 전용 — 시군은 공고명에서 파싱
        supplyType: card.bizTyNm,
        apply_start: card.applyStart,
        apply_end: card.applyEnd,
        url: ghDetailUrl(card),
        raw: card,
      };
      const n = normalize(this.source, raw);
      if (n) out.push(n);
    }
    console.log(`[gh] 적재 후보 ${out.length}건, 접수시작일 ${out.filter((n) => n.apply_start).length}건`);
    return out;
  }
}
