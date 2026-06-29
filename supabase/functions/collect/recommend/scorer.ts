// RecommendationEngine (C27) — 점수·정렬·사유 (FR-10, BR-U6-9~12). 순수 함수.
import type { NoticeInput } from "../types.ts";
import { REGION_ALIAS } from "../region-alias.ts";
import { todayKST } from "./matcher.ts";
import type {
  HouseholdProfile,
  MatchResult,
  Recommendation,
  Weights,
} from "./types.ts";
import { DEFAULT_WEIGHTS } from "./weights.ts";

const PREFERRED_SIDO_OF: Record<string, string> = {
  안양시: "경기",
  군포시: "경기",
  광명시: "경기",
  의왕시: "경기",
};

// 경기 권역(북부/남부) — 광역 공고("[경기북부]" 등)와 관심지역의 권역 일치 판정용.
const GYEONGGI_NORTH = new Set([
  "고양시", "의정부시", "파주시", "양주시", "구리시", "남양주시", "포천시",
  "동두천시", "연천군", "가평군", "김포시",
]);
const GYEONGGI_SOUTH = new Set([
  "수원시", "성남시", "안양시", "부천시", "광명시", "평택시", "안산시", "과천시",
  "오산시", "시흥시", "군포시", "의왕시", "하남시", "용인시", "이천시", "안성시",
  "화성시", "광주시", "여주시",
]);
type Zone = "north" | "south";

function zoneOfSigu(sigu: string): Zone | null {
  // 접미사(시/군/구) 유무 무관 매칭 — 사용자가 "안양"/"안양시" 어느 쪽으로 입력해도 인식.
  const base = sigu.replace(/(시|군|구)$/, "");
  const inSet = (set: Set<string>) => [...set].some((c) => c.replace(/(시|군)$/, "") === base);
  if (inSet(GYEONGGI_NORTH)) return "north";
  if (inSet(GYEONGGI_SOUTH)) return "south";
  return null;
}

/** 광역 공고의 권역을 제목에서 추론(경기북부/남부 + 권역 대표도시). */
function noticeGyeonggiZone(notice: NoticeInput): Zone | null {
  const t = `${notice.title ?? ""} ${notice.region_sigu ?? ""}`;
  if (/경기\s*북부/.test(t)) return "north";
  if (/경기\s*남부|경기지역본부/.test(t)) return "south";
  for (const c of GYEONGGI_NORTH) if (t.includes(c.replace(/(시|군)$/, ""))) return "north";
  for (const c of GYEONGGI_SOUTH) if (t.includes(c.replace(/(시|군)$/, ""))) return "south";
  return null;
}

function daysUntil(applyEnd: string | null, today: string): number | null {
  if (!applyEnd) return null;
  const a = new Date(applyEnd + "T00:00:00Z").getTime();
  const b = new Date(today + "T00:00:00Z").getTime();
  if (Number.isNaN(a)) return null;
  return Math.round((a - b) / 86400000);
}

/** 희망지역 일치도 [0..1] (BR-U6-10, A4=A). */
export function regionScore(notice: NoticeInput, p: HouseholdProfile): number {
  const prefsSigu = (p.preferences.regions ?? []).map((r) => REGION_ALIAS[r] ?? r);
  const sigu = notice.region_sigu;
  const sido = notice.region_sido;
  if (sigu && prefsSigu.some((pr) => pr === sigu || sigu.includes(pr) || pr.includes(sigu))) {
    return 1.0;
  }
  const mentionsSeoul = (p.preferences.regions ?? []).some((r) => r.includes("서울"));
  if (mentionsSeoul && sido === "서울") return 0.7;
  const preferredSidos = new Set(prefsSigu.map((s) => PREFERRED_SIDO_OF[s]).filter(Boolean));
  if (sido && preferredSidos.has(sido)) return 0.5;
  return 0.2; // 서울·경기 내(수집 범위) 기본
}

/**
 * 관심지역 필터 (v2). "관심지역만 남기기"가 아니라 "먼 경기 도시만 제외".
 * - 관심지역 미설정 → true(필터 없음)
 * - 서울(시도/자치구) → 관심지역에 '서울'이 있을 때만 유지
 * - 시군구 미상(경기 광역) → true(데이터 미비 시 비우지 않음)
 * - 관심 시군구 일치(별칭·부분일치) → true
 * - 그 외(이천·양주·화성·고양 등 관심지역 밖 경기) → false (추천 제외)
 *
 * 기존 regionScore의 '같은 시도(경기) 전체 0.5점' 노출 정책을 시군구 기준으로 좁힘.
 */
export function isPreferredRegion(notice: NoticeInput, p: HouseholdProfile): boolean {
  const regions = p.preferences.regions ?? [];
  if (regions.length === 0) return true; // 관심지역 미설정 → 전체 허용
  const wantsSeoul = regions.some((r) => r.includes("서울"));
  const sigu = notice.region_sigu;
  // 서울(시도 또는 자치구): 관심지역에 '서울'이 있을 때만 유지
  if (notice.region_sido === "서울" || (sigu != null && sigu.endsWith("구"))) return wantsSeoul;
  const prefsSigu = regions.map((r) => REGION_ALIAS[r] ?? r);
  if (!sigu) {
    // 경기 광역 공고(시군구 미상, 예: "[경기북부]") → 권역(북부/남부)으로 판정.
    const noticeZone = noticeGyeonggiZone(notice);
    if (!noticeZone) return true; // 권역 불명 → 보수적으로 유지
    const userZones = new Set(prefsSigu.map(zoneOfSigu).filter(Boolean) as Zone[]);
    if (userZones.size === 0) return true; // 관심지역 권역 불명 → 유지
    return userZones.has(noticeZone); // 관심 권역과 일치할 때만 유지
  }
  if (prefsSigu.some((pr) => pr === sigu || sigu.includes(pr) || pr.includes(sigu))) return true;
  return false; // 관심지역 밖 경기 도시 → 제외
}

/**
 * 부부 신혼집으로 부적합한 '너무 작은 평형'인지 (v2, 원룸/청년매입임대 등 제외).
 * 희망 전용면적 하한(areaMin)이 있고, 공고 최대 전용면적이 그보다 작으면 제외.
 * 면적 미상이면 베스트에포트로 유지(false).
 */
export function tooSmallForCouple(notice: NoticeInput, p: HouseholdProfile): boolean {
  const min = p.preferences.areaMin;
  if (min == null || min <= 0) return false;
  const nMax = notice.area_max ?? notice.area_min;
  if (nMax == null) return false;
  return nMax < min;
}

/** 면적 적합도 [0..1]. */
export function areaScore(notice: NoticeInput, p: HouseholdProfile): number {
  const { areaMin, areaMax } = p.preferences;
  if (areaMin == null && areaMax == null) return 1.0;
  if (notice.area_min == null && notice.area_max == null) return 0.5; // 미상 중립
  const nMin = notice.area_min ?? notice.area_max ?? 0;
  const nMax = notice.area_max ?? notice.area_min ?? 0;
  const pMin = areaMin ?? 0;
  const pMax = areaMax ?? Number.MAX_SAFE_INTEGER;
  if (nMax >= pMin && nMin <= pMax) return 1.0; // 겹침
  const gap = nMin > pMax ? nMin - pMax : pMin - nMax;
  return gap <= 5 ? 0.5 : 0;
}

function priorityScore(notice: NoticeInput): number {
  switch (notice.priority) {
    case "1순위":
      return 1.0;
    case "2순위":
      return 0.5;
    default:
      return 0.3;
  }
}

function deadlineScore(notice: NoticeInput, today: string): number {
  const d = daysUntil(notice.apply_end, today);
  if (d == null) return 0.3;
  if (d <= 7) return 1.0;
  if (d >= 30) return 0;
  return (30 - d) / 23;
}

function bestStatus(m: MatchResult): "eligible" | "conditional" {
  return m.perSupplyType.some((s) => s.status === "eligible") ? "eligible" : "conditional";
}

function buildReason(
  breakdown: Record<string, number>,
  notice: NoticeInput,
  status: "eligible" | "conditional",
  today: string,
): string {
  const phrases: Record<string, string> = {
    희망지역: notice.region_sigu ? `관심지역(${notice.region_sigu})` : "관심지역",
    청약순위: notice.priority ? `${notice.priority}` : "",
    면적: "희망 면적 적합",
    마감임박: (() => {
      const d = daysUntil(notice.apply_end, today);
      return d != null && d >= 0 ? `마감 임박(D-${d})` : "";
    })(),
    자격여유: status === "eligible" ? "자격 충족" : "",
  };
  const top = Object.entries(breakdown)
    .filter(([k, v]) => v > 0 && phrases[k])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => phrases[k])
    .filter(Boolean);
  const base = top.length ? top.join(" · ") : "서울·경기 내 신청 가능 공고";
  return status === "conditional" ? `${base} (일부 조건 확인 필요)` : base;
}

/** 자격 통과 공고를 점수화·정렬해 추천 목록 생성. (BR-U6-9~12) */
export function rank(
  matches: MatchResult[],
  notices: NoticeInput[],
  profile: HouseholdProfile,
  weights: Weights = DEFAULT_WEIGHTS,
  today: string = todayKST(),
): Recommendation[] {
  const byId = new Map(notices.map((n) => [n.id, n]));

  const recs: Recommendation[] = [];
  for (const m of matches) {
    if (!m.anyEligible) continue; // BR-U6-9
    const notice = byId.get(m.noticeId);
    if (!notice) continue;
    const d = daysUntil(notice.apply_end, today);
    if (d != null && d < 0) continue; // 마감 제외
    if (!isPreferredRegion(notice, profile)) continue; // v2: 관심지역 외(먼 경기) 제외
    if (tooSmallForCouple(notice, profile)) continue; // v2: 원룸 등 너무 작은 평형 제외

    const status = bestStatus(m);
    const breakdown: Record<string, number> = {
      희망지역: round(regionScore(notice, profile) * weights.region),
      자격여유: round((status === "eligible" ? 1.0 : 0.5) * weights.eligibility),
      면적: round(areaScore(notice, profile) * weights.area),
      청약순위: round(priorityScore(notice) * weights.priority),
      마감임박: round(deadlineScore(notice, today) * weights.deadline),
    };
    const score = round(Object.values(breakdown).reduce((a, b) => a + b, 0));
    const eligibleTypes = m.perSupplyType
      .filter((s) => s.status === "eligible" || s.status === "conditional")
      .map((s) => s.type);

    recs.push({
      noticeId: m.noticeId,
      score,
      eligibleTypes,
      reasonSummary: buildReason(breakdown, notice, status, today),
      scoreBreakdown: breakdown,
    });
  }

  // BR-U6-11 정렬: score desc → apply_end asc(nulls last) → id
  recs.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const ea = byId.get(a.noticeId)?.apply_end ?? "9999-12-31";
    const eb = byId.get(b.noticeId)?.apply_end ?? "9999-12-31";
    if (ea !== eb) return ea < eb ? -1 : 1;
    return a.noticeId < b.noticeId ? -1 : 1;
  });
  return recs;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
