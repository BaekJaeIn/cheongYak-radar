// 피드 보조 필터 변환·평가 (순수, BR-U3-5). 테스트 대상.
import type { Notice, SourceType } from "@/lib/types/notice";
import type { FeedFilter, FeedKind } from "./types";

const SALE_SOURCES: SourceType[] = ["apt"];
const RENT_SOURCES: SourceType[] = ["lh", "sh", "private"];

// 생활권 별칭(평촌→안양시 등) — 수집 단계 region-alias와 동기화.
const REGION_ALIAS: Record<string, string> = {
  평촌: "안양시",
  인덕원: "안양시",
  산본: "군포시",
  백운밸리: "의왕시",
  포일: "의왕시",
  과천지식정보타운: "과천시",
};

/**
 * 관심지역 필터 (v2). "관심지역만 남기기"가 아니라 "먼 경기 도시만 제외".
 * 추천 엔진 isPreferredRegion과 동일 규칙의 읽기측 미러.
 *
 * 유지: 관심지역(별칭·부분일치) · 서울(인접 metro) · 시군구 미상(경기 표기만, best-effort)
 * 제외: 시군구가 명확히 관심지역 밖인 경기 도시(이천·양주·화성·성남 등)
 * regions 비어 있으면 전체 유지(필터 없음).
 */
export function passesRegion(notice: Notice, regions?: string[]): boolean {
  if (!regions || regions.length === 0) return true;
  const sigu = notice.region_sigu;
  if (!sigu) return true; // 지역 미상 → 유지(데이터 미비 시 비우지 않음)
  if (notice.region_sido === "서울") return true; // 서울은 인접 권역으로 유지
  const prefs = regions.map((r) => REGION_ALIAS[r] ?? r);
  if (prefs.some((pr) => pr === sigu || sigu.includes(pr) || pr.includes(sigu))) return true;
  return false; // 관심지역 밖 경기 도시 → 제외
}

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
  if (!passesRegion(notice, filter.regions)) return false;
  return true;
}
