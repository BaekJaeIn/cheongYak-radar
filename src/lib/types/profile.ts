// 가구 프로필 공유 도메인 타입 (v2, household_profile 단일행에 저장)
// 구조: household-profile.md §10 스냅샷 (상세 수치는 로컬 전용 파일 참조 — 공개 레포 제외)
// 근거: components.md "HouseholdProfile", requirements.md §12.2 FR-8

import type { SourceType } from "./notice";

export type MaritalStatus = "single" | "pre_newlywed" | "newlywed" | "married";

/** 청약통장 정보. */
export interface SavingsAccount {
  type: string; // 주택청약종합저축 등
  count: number; // 납입 횟수
  amount: number; // 납입 인정 금액(원)
}

/** 세대 구성원(본인/배우자) 개별 정보. */
export interface Member {
  birthYear: number;
  monthlyIncome: number; // 월소득(원)
  savingsAccount?: SavingsAccount;
}

/** 추천/표시 희망 조건. */
export interface ProfilePreferences {
  areaMin?: number; // 희망 전용면적 하한(㎡)
  areaMax?: number; // 희망 전용면적 상한(㎡)
  regions: string[]; // 관심지역 (가산점 대상, A4=A)
  sources: SourceType[]; // 관심 공급원
}

/**
 * 단일 가구(2인) 프로필. household_profile.profile(JSONB)에 1건 저장.
 * 민감정보(소득·자산) 포함 — service_role 경유로만 접근(0004 RLS).
 */
export interface HouseholdProfile {
  maritalStatus: MaritalStatus;
  homeless: boolean; // 무주택 여부
  headOfHousehold: boolean; // 세대주 여부
  children: number; // 자녀 수
  members: number; // 세대 구성원 수
  self: Member;
  partner: Member;
  assets: {
    financial: number; // 금융자산(원)
    carValue: number; // 자동차가액(원)
  };
  residence: {
    sido: string;
    sigu: string;
    since: string; // 전입일 YYYY-MM-DD
  };
  firstTimeBuyer: boolean; // 생애최초 대상 여부
  preferences: ProfilePreferences;
}
