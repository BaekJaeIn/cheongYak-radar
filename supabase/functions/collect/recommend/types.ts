// U6 추천 엔진 타입 (순수, Deno/Node 공통).
// HouseholdProfile은 src/lib/types/profile.ts 미러(Edge 자기완결성).
// 근거: U6 domain-entities.md (E1~E5), business-rules.md.

export type MaritalStatus = "single" | "pre_newlywed" | "newlywed" | "married";

export interface SavingsAccount {
  type?: string;
  count: number;
  amount?: number;
}
export interface Member {
  birthYear: number;
  monthlyIncome: number;
  savingsAccount?: SavingsAccount;
}
export interface ProfilePreferences {
  areaMin?: number;
  areaMax?: number;
  regions: string[];
  sources: string[];
}
export interface Residence {
  sido: string;
  sigu: string;
  since: string;
}
export interface HouseholdProfile {
  maritalStatus: MaritalStatus;
  homeless: boolean;
  headOfHousehold: boolean;
  children: number;
  members: number;
  self: Member;
  partner: Member;
  assets: { financial: number; carValue: number };
  residence: Residence; // 본인 거주지
  partnerResidence?: Residence; // 여자친구(배우자) 거주지 — 우선공급 판정에 함께 사용
  firstTimeBuyer: boolean;
  preferences: ProfilePreferences;
}

/** 연도별 법정 기준표 (E3, Q-FU6-3=A). */
export interface CriteriaTable {
  year: number;
  incomeBaseByHouseholdSize: Record<number, number>; // 가구원수별 도시근로자 월평균소득 100%(원)
  incomePctByType: Record<string, number>; // 공급유형별 소득 한도 기본%(공고 미명시 fallback)
  assetLimitByType: Record<string, number>; // 공급유형별 총자산 한도(원)
  carLimit: number; // 자동차가액 한도(원)
  defaultResidencyMonths: number; // 해당지역 우선공급 거주기간 기본 가정(개월)
}

export type MatchStatus = "eligible" | "conditional" | "ineligible";

export interface SupplyTypeMatch {
  type: string;
  status: MatchStatus;
  reasons: string[];
}
export interface MatchResult {
  noticeId: string;
  perSupplyType: SupplyTypeMatch[];
  anyEligible: boolean; // eligible 또는 conditional 하나 이상
}

export interface Recommendation {
  noticeId: string;
  score: number; // 0~100
  eligibleTypes: string[];
  reasonSummary: string;
  scoreBreakdown: Record<string, number>;
}

/** 점수 가중치(요인별 최대점). 합=100. (BR-U6-10) */
export interface Weights {
  region: number;
  eligibility: number;
  area: number;
  priority: number;
  deadline: number;
}
