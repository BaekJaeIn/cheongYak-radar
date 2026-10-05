// v9 출처별 청약시작일 파서 (순수, FR-17). Deno/Node 공통 — vitest 테스트 대상.
// LH 상세 API 응답 · SH 목록/상세 HTML · GH 메인 카드 HTML → 날짜·공고 필드.

/** 날짜 문자열 → YYYY-MM-DD. "2026.07.14", "20260819", "2026-07-14", "2026. 10. 6." 지원 (FR-17.5). */
export function toIsoDate(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  const compact = s.match(/^(20\d{2})(\d{2})(\d{2})$/);
  const m = compact ?? s.match(/^(20\d{2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function earliest(dates: (string | null)[]): string | null {
  const valid = dates.filter((d): d is string => !!d).sort();
  return valid[0] ?? null;
}

// ─── LH ──────────────────────────────────────────────────────────────

/** LH 배열형 응답에서 key 데이터셋 추출 ([{dsSch},{dsList:[...]}] 형태). */
export function lhDataset(body: unknown, key: string): Record<string, unknown>[] {
  if (!Array.isArray(body)) return [];
  for (const block of body) {
    if (block && typeof block === "object" && Array.isArray((block as Record<string, unknown>)[key])) {
      return (block as Record<string, unknown>)[key] as Record<string, unknown>[];
    }
  }
  return [];
}

/**
 * LH 상세정보 API 공급일정(dsSplScdl) → 청약시작일·당첨발표일 (FR-17.1).
 * ACP_DTTM 예: "2026.07.20 10:00 ~ 2026.07.21 17:00" — 구분(일반/우선 등)별 행 중 가장 이른 시작일.
 */
export function parseLhSchedule(body: unknown): { applyStart: string | null; winnerDate: string | null } {
  const rows = lhDataset(body, "dsSplScdl");
  return {
    applyStart: earliest(rows.map((r) => toIsoDate(String(r.ACP_DTTM ?? "").split("~")[0]))),
    winnerDate: earliest(rows.map((r) => toIsoDate(r.PZWR_ANC_DT))),
  };
}

// ─── HTML 공통 ───────────────────────────────────────────────────────

/** HTML → 공백 정규화된 평문 (script/style/주석 제거). */
export function htmlToText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── SH ──────────────────────────────────────────────────────────────

export interface ShListRow {
  seq: string;
  type: string;
  title: string;
  postedDate: string | null; // 공고게시일
  announceDate: string | null; // 발표일
  status: string | null; // 임대만 (모집중/모집완료)
  link: string;
}

const SH_LINK_HOST = "https://www.i-sh.co.kr/";

/**
 * 서울주거포털 SH 목록 HTML → 행 (FR-17.2). 주석 처리된 <a>가 공고명 칸에 있어 주석을 먼저 제거.
 * 임대 8칸 [번호,유형,공고명,게시일,발표일,모집상태,담당부서,링크] / 분양 7칸 [번호,유형,공고명,게시일,발표일,담당부서,링크].
 */
export function parseShList(html: string): ShListRow[] {
  const clean = html.replace(/<!--[\s\S]*?-->/g, "");
  const out: ShListRow[] = [];
  for (const tr of clean.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const tds = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (tds.length < 7) continue;
    const texts = tds.map(htmlToText);
    const href = tds[tds.length - 1].match(/href="([^"]+)"/i)?.[1]?.replace(/&amp;/g, "&");
    if (!href || !href.startsWith(SH_LINK_HOST)) continue;
    const seq = href.match(/[?&]seq=(\d+)/)?.[1];
    if (!seq || !texts[2]) continue;
    out.push({
      seq,
      type: texts[1],
      title: texts[2],
      postedDate: toIsoDate(texts[3]),
      announceDate: toIsoDate(texts[4]),
      status: tds.length >= 8 ? texts[5] || null : null,
      link: href,
    });
  }
  return out;
}

const SH_APPLY_KEY =
  /(접수일|접수기간|접수 일정|신청기간|신청 기간|청약신청 일정|청약 신청 일정|청약접수|신청접수 일정|신청일정|인터넷접수|인터넷 접수)/g;
const SH_RANGE =
  /(20\d{2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})[^~]{0,30}~\s*(?:(20\d{2})\s*[.\-/]\s*)?(\d{1,2})\s*[.\-/]\s*(\d{1,2})/;
const SH_DATE = /(20\d{2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})/;

/**
 * SH 상세 본문 평문 → 접수 시작·마감일 (FR-17.2, best-effort).
 * 접수 키워드 뒤 160자 안의 첫 날짜(범위면 시작~끝). 날짜 없는 키워드("신청기간 종료 이후" 등)는 건너뜀.
 */
export function parseShApplyPeriod(text: string): { applyStart: string | null; applyEnd: string | null } {
  for (const k of text.matchAll(SH_APPLY_KEY)) {
    const win = text.slice(k.index!, k.index! + 160);
    const r = win.match(SH_RANGE);
    if (r) {
      return {
        applyStart: toIsoDate(`${r[1]}.${r[2]}.${r[3]}`),
        applyEnd: toIsoDate(`${r[4] ?? r[1]}.${r[5]}.${r[6]}`),
      };
    }
    const d = win.match(SH_DATE);
    if (d) return { applyStart: toIsoDate(`${d[1]}.${d[2]}.${d[3]}`), applyEnd: null };
  }
  return { applyStart: null, applyEnd: null };
}

// ─── GH ──────────────────────────────────────────────────────────────

export interface GhCard {
  pbancNo: string;
  bizTyNm: string | null;
  bizTyCd: string | null;
  title: string;
  applyStart: string | null;
  applyEnd: string | null;
}

/** 대기열(NetFunnel) 활성 여부 — 주석(`// NetFunnel_Action(`)은 비활성. 활성이면 우회하지 않고 skip. */
export function ghNetFunnelActive(html: string): boolean {
  return /^\s*(?!\/\/)\s*NetFunnel_Action\s*\(/m.test(html);
}

/** GH 메인 카드 HTML → 공고 (FR-17.3). pbancNo 중복 제거, 상가 유형 제외. */
export function parseGhCards(html: string): GhCard[] {
  const out: GhCard[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*\bdata-pbancNo="(\d+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const pbancNo = m[1];
    if (seen.has(pbancNo)) continue;
    const open = m[0];
    const bizTyNm = open.match(/data-bizTyNm="([^"]*)"/i)?.[1]?.trim() || null;
    if (bizTyNm?.includes("상가")) continue;
    const titleHtml = m[2].match(/<p class="leading-6[^"]*">([\s\S]*?)<\/p>/i)?.[1];
    const title = titleHtml ? htmlToText(titleHtml) : "";
    if (!title) continue;
    const period = htmlToText(m[2].match(/<p class="calender_box">([\s\S]*?)<\/p>/i)?.[1] ?? "")
      .replace("신청기간", "")
      .split("~");
    seen.add(pbancNo);
    out.push({
      pbancNo,
      bizTyNm,
      bizTyCd: open.match(/data-bizTyCd="([^"]*)"/i)?.[1] || null,
      title,
      applyStart: toIsoDate(period[0]),
      applyEnd: toIsoDate(period[1]),
    });
  }
  return out;
}

const GH_BASE = "https://apply.gh.or.kr";
const GH_DETAIL_PATHS: Record<string, string> = {
  "06": "/sb/sr/sr7155/selectPbancDetailView.do",
  "07": "/sb/sr/sr7170/selectPbancDetailView.do",
};

/** GH 공고 상세 URL — bizTyCd별 경로 (메인 페이지 JS 라우팅 실측). */
export function ghDetailUrl(card: Pick<GhCard, "pbancNo" | "bizTyCd">): string {
  const path = GH_DETAIL_PATHS[card.bizTyCd ?? ""] ?? "/sb/sr/sr7150/selectPbancDetailView.do";
  return `${GH_BASE}${path}?pbancNo=${card.pbancNo}`;
}
