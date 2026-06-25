// 피드 보조 필터 변환·평가 (순수, BR-U3-5). 테스트 대상.
import type { Notice, SourceType } from "@/lib/types/notice";
import type { FeedFilter, FeedKind } from "./types";

const SALE_SOURCES: SourceType[] = ["apt"];
const RENT_SOURCES: SourceType[] = ["lh", "sh", "private"];

// 생활권/택지 별칭(평촌→안양시 등) — 수집 단계 region-alias.ts와 동기화.
const REGION_ALIAS: Record<string, string> = {
  평촌: "안양시", 인덕원: "안양시", 산본: "군포시", 백운밸리: "의왕시", 포일: "의왕시",
  과천지식정보타운: "과천시", 분당: "성남시", 판교: "성남시", 낙생: "성남시", 복정: "성남시",
  일산: "고양시", 창릉: "고양시", 삼송: "고양시", 지축: "고양시", 향동: "고양시",
  광교: "수원시", 당수: "수원시", 동탄: "화성시", 옥정: "양주시", 회천: "양주시",
  운정: "파주시", 부발: "이천시", 운암: "오산시", 김량장: "용인시", 왕숙: "남양주시",
  다산: "남양주시", 별내: "남양주시", 갈매: "구리시", 교산: "하남시", 미사: "하남시",
  위례: "성남시", 오류: "구로구",
};
// 접미사 없는 수도권 시 이름(LH 패턴) — region_alias.ts GG_CITY_STEMS와 동기화.
const GG_CITY_STEMS = [
  "남양주", "의정부", "동두천", "수원", "성남", "고양", "용인", "화성", "부천", "안산",
  "안양", "평택", "시흥", "파주", "김포", "광명", "군포", "이천", "양주", "오산", "안성",
  "의왕", "하남", "구리", "과천", "포천", "가평", "연천", "양평", "여주",
];
const GG_GUN = new Set(["가평", "연천", "양평"]);
const GG_CITY_RE = new RegExp(`(${GG_CITY_STEMS.join("|")})`);
const SEOUL_GU_STEMS = [
  "종로", "용산", "성동", "광진", "동대문", "중랑", "성북", "강북", "도봉", "노원", "은평",
  "서대문", "마포", "양천", "강서", "구로", "금천", "영등포", "동작", "관악", "서초", "강남",
  "송파", "강동",
];
const SEOUL_GU_RE = new RegExp(`(${SEOUL_GU_STEMS.join("|")})`);
const SIGU_RE = /([가-힣]{2,}(?:시|군|구))/;

/**
 * region_sigu가 비었을 때 제목에서 시군구를 추론(수집기 parseRegion 미러).
 * Edge Function 재배포·재수집 전이라도 읽기 단계에서 먼 지역을 거르기 위함.
 */
export function deriveSigu(text: string | null | undefined, sido: string | null): string | null {
  if (!text) return null;
  for (const [alias, mapped] of Object.entries(REGION_ALIAS)) {
    if (text.includes(alias)) return mapped;
  }
  const m = text.match(SIGU_RE);
  if (m) return m[1];
  if (sido !== "서울") {
    const c = text.match(GG_CITY_RE);
    if (c) return c[1] + (GG_GUN.has(c[1]) ? "군" : "시");
  }
  if (sido === "서울" || /서울/.test(text)) {
    const g = text.match(SEOUL_GU_RE);
    if (g) return g[1].endsWith("구") ? g[1] : `${g[1]}구`;
  }
  return null;
}

/**
 * 관심지역 필터 (v2). "관심지역만 남기기"가 아니라 "먼 경기 도시만 제외".
 * 추천 엔진 isPreferredRegion과 동일 규칙의 읽기측 미러.
 *
 * region_sigu가 비면 제목에서 도시를 추론(deriveSigu) — 재수집 전에도 동작.
 * 유지: 관심지역(별칭·부분일치) · 서울(인접 metro) · 정말로 도시 추론 불가(광역 매입임대 등)
 * 제외: 관심지역 밖으로 확인된 경기 도시(이천·양주·화성·고양·김포 등)
 */
export function passesRegion(notice: Notice, regions?: string[]): boolean {
  if (!regions || regions.length === 0) return true;
  if (notice.region_sido === "서울") return true; // 서울은 인접 권역으로 유지
  const sigu = notice.region_sigu ?? deriveSigu(notice.title, notice.region_sido);
  if (!sigu) return true; // 도시 추론 불가(광역 단위) → 유지
  if (sigu.endsWith("구")) return true; // 서울 자치구 → 유지
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
