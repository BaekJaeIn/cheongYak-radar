// 정규화 헬퍼 (순수, BR-U1-1~5). Deno/Node 공통 — vitest 테스트 가능.

import { parseRegion } from "./region-alias.ts";
import { extractCriteria, isRegionInScope } from "./criteria.ts";
import { makeNoticeId, type NoticeInput, type Priority, type SourceType } from "./types.ts";

/** 면적 텍스트에서 min/max(㎡) 추출. "전용 46.97㎡", "46~59㎡", "84.95" 등. */
export function parseArea(text: string | null | undefined): {
  min: number | null;
  max: number | null;
} {
  if (!text) return { min: null, max: null };
  const nums = (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter((n) => n > 0 && n < 1000);
  if (nums.length === 0) return { min: null, max: null };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

/** 신혼/예비신혼 추론 (키워드, BR-4). */
export function inferNewlywed(...parts: (string | null | undefined)[]): {
  newlywed: boolean;
  preNewlywed: boolean;
} {
  const t = parts.filter(Boolean).join(" ");
  const newlywed = t.includes("신혼희망") || t.includes("신혼부부") || t.includes("신혼");
  const preNewlywed = t.includes("예비신혼");
  return { newlywed, preNewlywed };
}

/** 순위 매핑 (BR-5). */
export function mapPriority(text: string | null | undefined): Priority | null {
  if (!text) return null;
  if (text.includes("무순위") || text.includes("줍줍")) return "무순위";
  if (text.includes("1순위")) return "1순위";
  if (text.includes("2순위")) return "2순위";
  return null;
}

/** Collector가 추출한 1차 필드. 실 API/크롤링 필드명은 잠정(source-mapping.md). */
export interface RawNotice {
  source_no: string;
  title: string;
  address?: string | null; // 공급위치/주소
  areaText?: string | null;
  supplyType?: string | null;
  priorityText?: string | null;
  notice_date?: string | null;
  apply_start?: string | null;
  apply_end?: string | null;
  winner_date?: string | null;
  url?: string | null;
  eligibilityText?: string | null; // 자격요건 본문(있으면 criteria 추출에 사용)
  raw?: unknown;
}

/**
 * RawNotice → NoticeInput 정규화. 필수 필드 없으면 null 반환(호출부 skip).
 * v2: 수집 범위(서울·경기) 밖이면 null로 드롭(C-6), eligibility 베스트에포트 추출(FR-9).
 */
export function normalize(source: SourceType, r: RawNotice): NoticeInput | null {
  if (!r.source_no || !r.title) return null;

  const region = parseRegion(r.address ?? r.title);
  const area = parseArea(r.areaText);
  const nl = inferNewlywed(r.supplyType, r.title);

  // SH는 서울 고정 보정
  const sido = region.sido ?? (source === "sh" ? "서울" : null);

  // 수집 지역 한정: 서울·경기 밖이면 드롭 (C-6). sido 미파악(null)은 유지.
  if (!isRegionInScope(sido)) return null;

  const eligibility = extractCriteria([r.title, r.supplyType, r.eligibilityText]);

  return {
    id: makeNoticeId(source, r.source_no),
    source_no: r.source_no,
    source,
    title: r.title,
    region_sido: sido,
    region_sigu: region.sigu,
    area_min: area.min,
    area_max: area.max,
    notice_date: r.notice_date ?? null,
    apply_start: r.apply_start ?? null,
    apply_end: r.apply_end ?? null,
    winner_date: r.winner_date ?? null,
    supply_type: r.supplyType ?? null,
    newlywed: nl.newlywed,
    pre_newlywed: nl.preNewlywed,
    priority: mapPriority(r.priorityText ?? r.title),
    url: r.url ?? null,
    eligibility,
    raw: r.raw ?? r,
  };
}
