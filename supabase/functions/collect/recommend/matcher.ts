// EligibilityMatcher (C26) — 공고 × 프로필 자격 판정 (FR-9, BR-U6-1~8). 순수 함수.
import type { NoticeInput } from "../types.ts";
import { NO_INCOME_LIMIT_TYPES } from "./criteria-2026.ts";
import type {
  CriteriaTable,
  HouseholdProfile,
  MatchResult,
  MatchStatus,
  SupplyTypeMatch,
} from "./types.ts";

/** 판정 대상 공급유형 (BR-U6-8, Q-FU6-6=B 임대 포함). */
const KNOWN_TYPES = new Set([
  "신혼부부특별공급",
  "신혼부부",
  "신혼희망타운",
  "생애최초",
  "일반공급",
  "무순위",
  "행복주택",
  "국민임대",
  "영구임대",
  "장기전세",
  "민간임대",
  "청년",
  "다자녀",
  "노부모부양",
]);

const NEWLYWED_TYPES = new Set(["신혼부부특별공급", "신혼부부", "신혼희망타운", "행복주택"]);

/** YYYY-MM-DD(KST) 오늘. */
export function todayKST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function monthsSince(since: string | undefined, today: string): number | null {
  if (!since) return null;
  const a = new Date(since + "T00:00:00Z").getTime();
  const b = new Date(today + "T00:00:00Z").getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, Math.floor((b - a) / (30 * 86400000)));
}

/** 거주지가 우선공급 요건 지역에 해당하는지. region 미상이면 true(범위 보수적). */
function residenceMatchesRegion(
  res: { sido?: string; sigu?: string } | undefined,
  region: string | undefined,
): boolean {
  if (!res) return false;
  if (!region) return true;
  // 수도권/해당지역 등 광역 표기 → 서울·경기면 인정
  if (/수도권|해당지역|서울·?경기/.test(region)) {
    return res.sido === "서울" || res.sido === "경기";
  }
  const fields = [res.sido ?? "", res.sigu ?? ""];
  return fields.some((f) => f && (f.includes(region) || region.includes(f)));
}

/**
 * 본인·여자친구(배우자) 거주지 중 우선공급 요건 지역에 해당하는 최장 거주개월.
 * 해당 지역 거주가 없으면 0, 거주지 정보 자체가 없으면 null. (BR-U6-5, v2 여친 거주지 반영)
 */
function bestResidencyMonths(
  profile: HouseholdProfile,
  region: string | undefined,
  today: string,
): number | null {
  const residences = [profile.residence, profile.partnerResidence].filter(Boolean) as {
    sido?: string;
    sigu?: string;
    since: string;
  }[];
  if (residences.length === 0) return null;
  let best: number | null = null;
  for (const r of residences) {
    const m = monthsSince(r.since, today);
    if (m == null) continue;
    const eff = residenceMatchesRegion(r, region) ? m : 0;
    best = best == null ? eff : Math.max(best, eff);
  }
  return best;
}

function combinedIncome(p: HouseholdProfile): number {
  return (p.self?.monthlyIncome ?? 0) + (p.partner?.monthlyIncome ?? 0);
}

/** 평가 대상 공급유형 결정 (BR-U6-8). */
export function resolveSupplyTypes(notice: NoticeInput): string[] {
  const fromCriteria = (notice.eligibility?.supplyTypes ?? []).filter((t) => KNOWN_TYPES.has(t));
  if (fromCriteria.length > 0) return Array.from(new Set(fromCriteria));
  if (notice.supply_type && KNOWN_TYPES.has(notice.supply_type)) return [notice.supply_type];
  return ["일반공급"]; // 추론 불가 → 일반공급 가정(conditional 경향)
}

/** 상태 하향(더 나쁜 쪽으로). eligible > conditional > ineligible */
function worse(a: MatchStatus, b: MatchStatus): MatchStatus {
  const rank: Record<MatchStatus, number> = { eligible: 2, conditional: 1, ineligible: 0 };
  return rank[a] <= rank[b] ? a : b;
}

function evalType(
  type: string,
  notice: NoticeInput,
  profile: HouseholdProfile,
  table: CriteriaTable,
  today: string,
): SupplyTypeMatch {
  const reasons: string[] = [];
  let status: MatchStatus = "eligible";
  const el = notice.eligibility ?? undefined;

  // BR-U6-1 무주택 (핵심 선결 조건)
  if (profile.homeless === false) {
    return { type, status: "ineligible", reasons: ["무주택 요건 미충족(보유 주택 있음)"] };
  }

  // v2: 1인 청년 대상 유형(청년매입임대·청년안심주택 등)은 부부(2인 이상) 가구 비해당.
  if (type === "청년" && (profile.members ?? 1) >= 2) {
    return { type, status: "ineligible", reasons: ["1인 청년 대상 — 부부 가구 비해당"] };
  }

  // BR-U6-6 예비신혼 / 생애최초 (조건부, A-4)
  if (profile.maritalStatus === "pre_newlywed") {
    if (type === "생애최초") {
      status = worse(status, "conditional");
      reasons.push("생애최초 특공은 혼인 후 자격(예비신혼 단계 조건부)");
    } else if (NEWLYWED_TYPES.has(type)) {
      reasons.push("예비신혼 신청 가능 — 입주 전 혼인신고 필요");
    }
  }

  // BR-U6-2 소득
  if (!NO_INCOME_LIMIT_TYPES.has(type)) {
    const pct = el?.incomePctLimit ?? table.incomePctByType[type];
    const base = table.incomeBaseByHouseholdSize[profile.members];
    if (pct != null && base != null) {
      const threshold = Math.round((base * pct) / 100);
      const income = combinedIncome(profile);
      if (income > threshold) {
        status = worse(status, "ineligible");
        reasons.push(`소득 기준 초과(합산 ${income.toLocaleString()} > 한도 ${threshold.toLocaleString()})`);
      } else {
        reasons.push(`소득 기준 충족(${pct}% 이내)`);
      }
    } else {
      status = worse(status, "conditional");
      reasons.push("소득 기준 확인 필요");
    }
  }

  // BR-U6-3 자산·자동차
  const assetLimit = el?.assetLimit ?? table.assetLimitByType[type];
  if (assetLimit != null) {
    if (profile.assets.financial > assetLimit) {
      status = worse(status, "ineligible");
      reasons.push(`총자산 기준 초과(${profile.assets.financial.toLocaleString()} > ${assetLimit.toLocaleString()})`);
    }
  }
  const carLimit = el?.carLimit ?? table.carLimit;
  if (carLimit != null && profile.assets.carValue > carLimit) {
    status = worse(status, "ineligible");
    reasons.push("자동차가액 기준 초과");
  }

  // BR-U6-4 청약통장
  if (el?.savingsReq) {
    const acc = profile.self?.savingsAccount;
    if (!acc || acc.count == null) {
      status = worse(status, "conditional");
      reasons.push("청약통장 조건 확인 필요");
    } else if (acc.count < el.savingsReq.count) {
      status = worse(status, "conditional");
      reasons.push(`납입횟수 부족 가능(${acc.count} < ${el.savingsReq.count})`);
    }
  }

  // BR-U6-5 거주요건 (해당지역 우선 — 미충족이어도 일반자격 유지)
  // v2: 본인·여자친구 거주지 중 요건 지역에 해당하는 최장 거주기간으로 판정.
  const resReq = el?.residencyReq;
  if (resReq) {
    const months = bestResidencyMonths(profile, resReq.region, today);
    if (months != null && months >= resReq.months) {
      reasons.push(`해당지역 우선공급 거주요건 충족(${months}개월)`);
    } else {
      reasons.push("해당지역 우선공급 거주기간 미충족(일반 자격 유지)");
    }
  }

  return { type, status, reasons };
}

/** 공고 × 프로필 → 공급유형별 자격 판정. (BR-U6-1~8) */
export function evaluate(
  notice: NoticeInput,
  profile: HouseholdProfile,
  table: CriteriaTable,
  today: string = todayKST(),
): MatchResult {
  const types = resolveSupplyTypes(notice);
  const perSupplyType = types.map((t) => evalType(t, notice, profile, table, today));
  const anyEligible = perSupplyType.some(
    (m) => m.status === "eligible" || m.status === "conditional",
  );
  return { noticeId: notice.id, perSupplyType, anyEligible };
}
