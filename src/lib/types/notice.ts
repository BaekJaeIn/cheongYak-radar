// 청약레이더 공유 도메인 타입 (U2 소유, 전 단위 공유)
// 근거: aidlc-docs/.../U2-data-platform/functional-design/domain-entities.md

export type SourceType = "apt" | "lh" | "sh" | "private";

export type Priority = "1순위" | "2순위" | "무순위";

/** 공고 도메인 모델. id = `${source}:${source_no}` (합성 키, BR-1) */
export interface Notice {
  id: string;
  source_no: string;
  source: SourceType;
  title: string;
  region_sido: string | null;
  region_sigu: string | null;
  area_min: number | null;
  area_max: number | null;
  notice_date: string | null; // YYYY-MM-DD
  apply_start: string | null;
  apply_end: string | null;
  winner_date: string | null;
  supply_type: string | null;
  newlywed: boolean;
  pre_newlywed: boolean;
  priority: Priority | null;
  url: string | null;
  eligibility_summary: string | null; // AI 요약 캐시 (U4, Gemini)
  eligibility: EligibilityCriteria | null; // 구조화 자격조건 (v2, U1 CriteriaExtractor 적재)
  raw: unknown;
  created_at: string; // timestamptz
  updated_at: string;
}

/**
 * 공고별 구조화 자격조건 (notices.eligibility JSONB). v2 — FR-9 입력.
 * CriteriaExtractor가 베스트에포트로 채우므로 모든 필드는 선택적(부분 채움 허용).
 * 근거: components.md "EligibilityCriteria", requirements.md §12.4
 */
export interface EligibilityCriteria {
  supplyTypes: string[]; // 공급유형 (신혼특공·신혼희망타운·생애최초·일반 등)
  incomePctLimit?: number; // 도시근로자 월평균소득 대비 한도(%)
  assetLimit?: number; // 총자산 한도(원)
  carLimit?: number; // 자동차가액 한도(원)
  residencyReq?: { region: string; months: number }; // 거주요건(지역/기간)
  savingsReq?: { months: number; count: number }; // 청약통장(기간/납입횟수)
  preNewlywedAllowed?: boolean; // 예비신혼 신청 가능
  firstTimeEligible?: boolean; // 생애최초 대상
}

/** 수집 단계에서 만들어 upsert로 넘기는 입력(타임스탬프는 DB가 채움). */
export type NoticeInput = Omit<
  Notice,
  "created_at" | "updated_at" | "eligibility_summary" | "eligibility"
> & {
  eligibility_summary?: string | null;
  eligibility?: EligibilityCriteria | null; // U1 CriteriaExtractor가 채움 (v2)
};

/** 화면 필터 (NoticeFilter). 모든 조건은 AND 결합 (BR-3). */
export interface NoticeFilter {
  regions: string[]; // 시군구 (예: "안양시"), "서울" 등 시도도 허용
  areaMin?: number;
  areaMax?: number;
  sources: SourceType[];
  priorities: Priority[];
  newlywed?: boolean;
  preNewlywed?: boolean;
  hideExpired: boolean; // 기본 true
}

/** 커서 페이지네이션 키 (BR-5). sort_apply_end 생성컬럼 + id 키셋. */
export interface Cursor {
  sortApplyEnd: string; // YYYY-MM-DD (apply_end 또는 '9999-12-31')
  id: string;
}

export interface Page {
  cursor?: Cursor;
  limit: number;
}

export interface NoticeListResult {
  items: Notice[];
  nextCursor?: Cursor;
}

/** 관심 지역 기본값 (C-5). */
export const DEFAULT_REGIONS: string[] = ["안양시", "군포시", "의왕시", "서울"];

/** 기본 필터 (FilterStore 최초값). */
export function defaultFilter(): NoticeFilter {
  return {
    regions: [...DEFAULT_REGIONS],
    sources: ["apt", "lh", "sh", "private"],
    priorities: [],
    hideExpired: true,
  };
}

export const ALL_SOURCES: SourceType[] = ["apt", "lh", "sh", "private"];

/** 유형 배지 라벨 (NFR-7: 색상 외 텍스트 병기). */
export const SOURCE_LABEL: Record<SourceType, string> = {
  apt: "분양",
  lh: "LH임대",
  sh: "SH임대",
  private: "민간임대",
};
