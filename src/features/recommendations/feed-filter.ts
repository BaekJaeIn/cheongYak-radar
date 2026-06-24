// 피드 보조 필터 변환·평가 (순수, BR-U3-5). 테스트 대상.
import type { Notice, SourceType } from "@/lib/types/notice";
import type { FeedFilter, FeedKind } from "./types";

const SALE_SOURCES: SourceType[] = ["apt"];
const RENT_SOURCES: SourceType[] = ["lh", "sh", "private"];

export function defaultFeedFilter(): FeedFilter {
  return { hideExpired: true };
}

/** kind → 해당 source 목록(전체면 undefined). */
export function kindToSources(kind?: FeedKind): SourceType[] | undefined {
  if (kind === "sale") return SALE_SOURCES;
  if (kind === "rent") return RENT_SOURCES;
  return undefined;
}

/** URL searchParams → FeedFilter. */
export function fromSearchParams(
  sp: Record<string, string | string[] | undefined>,
): FeedFilter {
  const kindRaw = typeof sp.kind === "string" ? sp.kind : undefined;
  const kind: FeedKind | undefined =
    kindRaw === "sale" || kindRaw === "rent" ? kindRaw : undefined;
  // expired=1 이면 마감 포함(hideExpired=false)
  const hideExpired = sp.expired === "1" ? false : true;
  return { kind, hideExpired };
}

/** FeedFilter → URLSearchParams(클라 네비게이션용). */
export function toSearchParams(filter: FeedFilter): URLSearchParams {
  const p = new URLSearchParams();
  if (filter.kind) p.set("kind", filter.kind);
  if (!filter.hideExpired) p.set("expired", "1");
  return p;
}

export function matchesKind(notice: Notice, kind?: FeedKind): boolean {
  const sources = kindToSources(kind);
  return !sources || sources.includes(notice.source);
}

export function isExpired(applyEnd: string | null, today: string): boolean {
  return applyEnd != null && applyEnd < today;
}

/** 필터 적용(공고 단위). */
export function passesFilter(notice: Notice, filter: FeedFilter, today: string): boolean {
  if (!matchesKind(notice, filter.kind)) return false;
  if (filter.hideExpired && isExpired(notice.apply_end, today)) return false;
  return true;
}
