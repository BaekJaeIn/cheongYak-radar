// 2026년 자격 기준표 (E3, Q-FU6-3=A). EligibilityMatcher가 참조.
// ⚠️ 수치는 공개자료 기반 대표/추정값 — 실제 적용 전 연도별 고시 기준으로 **확인 필요**.
//    (개인 정보 아님. 도시근로자 월평균소득·자산 한도는 공개 통계.)
// 연도 전환 시 criteria-YYYY.ts 추가 후 loadCriteriaTable에 등록.

import type { CriteriaTable } from "./types.ts";

export const CRITERIA_2026: CriteriaTable = {
  year: 2026,
  // 가구원수별 도시근로자 월평균소득 100% (원) — 대표/추정값, 확인 필요.
  incomeBaseByHouseholdSize: {
    1: 4_200_000,
    2: 6_000_000,
    3: 6_700_000,
    4: 7_400_000,
    5: 7_900_000,
  },
  // 공급유형별 소득 한도 기본%(공고 미명시 시 fallback). 맞벌이 우선 상향 가정.
  incomePctByType: {
    신혼부부특별공급: 140,
    신혼희망타운: 130,
    생애최초: 160,
    행복주택: 100,
    국민임대: 70,
    영구임대: 50,
    장기전세: 120,
    청년: 100,
  },
  // 공급유형별 총자산 한도(원) — 대표/추정값, 확인 필요.
  assetLimitByType: {
    신혼희망타운: 349_000_000,
    생애최초: 379_000_000,
    신혼부부특별공급: 379_000_000,
    국민임대: 357_000_000,
    영구임대: 241_000_000,
    행복주택: 349_000_000,
  },
  carLimit: 38_030_000,
  defaultResidencyMonths: 12,
};

/** 소득·자산 한도가 사실상 없는 공급유형(분양 일반/무순위/민간). */
export const NO_INCOME_LIMIT_TYPES = new Set(["일반공급", "무순위", "민간임대"]);

const TABLES: Record<number, CriteriaTable> = { 2026: CRITERIA_2026 };

/** 연도 기준표 로드. 없으면 가장 가까운 과거 연도 fallback(경고). */
export function loadCriteriaTable(year: number): CriteriaTable {
  if (TABLES[year]) return TABLES[year];
  const years = Object.keys(TABLES).map(Number).sort((a, b) => b - a);
  const fb = years.find((y) => y <= year) ?? years[0];
  console.warn(`[recommend] criteria ${year} 없음 → ${fb} fallback`);
  return TABLES[fb];
}
