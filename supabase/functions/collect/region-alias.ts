// 생활권명 → 행정구역 별칭 + 주소 파싱 (순수, BR-U1-2)
// Deno/Node 공통 (외부 의존 없음 → vitest 테스트 가능)

/** 생활권/택지지구 통칭을 시군구로 매핑. (도시명이 제목에 드러나지 않는 지구명) */
export const REGION_ALIAS: Record<string, string> = {
  평촌: "안양시",
  인덕원: "안양시",
  산본: "군포시",
  백운밸리: "의왕시",
  포일: "의왕시",
  과천지식정보타운: "과천시",
  // 성남권 택지(도시명 미노출)
  분당: "성남시",
  판교: "성남시",
  낙생: "성남시",
  복정: "성남시",
  // 고양권
  일산: "고양시",
  창릉: "고양시",
  삼송: "고양시",
  지축: "고양시",
  향동: "고양시",
  // 그 외 수도권 택지
  광교: "수원시",
  당수: "수원시",
  동탄: "화성시",
  옥정: "양주시",
  회천: "양주시",
  운정: "파주시",
  부발: "이천시",
  운암: "오산시",
  김량장: "용인시",
  왕숙: "남양주시",
  다산: "남양주시",
  별내: "남양주시",
  갈매: "구리시",
  교산: "하남시",
  미사: "하남시",
  위례: "성남시",
  // 서울 동 이름(구 미노출)
  오류: "구로구",
};

// 시도: 정식명·약어 모두 인식 → 표준 약어로 정규화. (긴 이름 우선 매칭)
const SIDO_FULL: [string, string][] = [
  ["서울", "서울"], ["경기", "경기"], ["인천", "인천"], ["부산", "부산"],
  ["대구", "대구"], ["대전", "대전"], ["울산", "울산"], ["세종", "세종"],
  ["강원특별자치도", "강원"], ["강원", "강원"], ["제주특별자치도", "제주"], ["제주", "제주"],
  ["충청북도", "충북"], ["충청남도", "충남"], ["충북", "충북"], ["충남", "충남"],
  ["전북특별자치도", "전북"], ["전라북도", "전북"], ["전라남도", "전남"], ["전북", "전북"], ["전남", "전남"],
  ["경상북도", "경북"], ["경상남도", "경남"], ["경북", "경북"], ["경남", "경남"],
  ["광주", "광주"], // 경기 '광주시'와 충돌 방지 위해 마지막(경기 우선 매칭)
];

// 수도권 시군구(서울 구 + 경기 시군) → 시도 추론용.
const SEOUL_GU = new Set(
  "종로구 중구 용산구 성동구 광진구 동대문구 중랑구 성북구 강북구 도봉구 노원구 은평구 서대문구 마포구 양천구 강서구 구로구 금천구 영등포구 동작구 관악구 서초구 강남구 송파구 강동구".split(" "),
);
const GYEONGGI_SIGU = new Set(
  "수원시 성남시 의정부시 안양시 부천시 광명시 평택시 동두천시 안산시 고양시 과천시 구리시 남양주시 오산시 시흥시 군포시 의왕시 하남시 용인시 파주시 이천시 안성시 김포시 화성시 광주시 양주시 포천시 여주시 연천군 가평군 양평군".split(" "),
);
// 시군구 표기 없이 단지/지구명만 나오는 경기 택지 보조 매핑.
const GYEONGGI_AREA = ["고양창릉", "성남복정", "남양주왕숙", "하남교산", "과천", "위례", "광교", "동탄", "옥정", "회천", "갈매", "삼송", "지축", "향동", "다산", "별내", "운정", "한강신도시"];

const SIGU_RE = /([가-힣]{2,}(?:시|군|구))/;

// 접미사("시") 없이 제목 앞에 붙는 수도권 시 이름 (LH 패턴: "양주옥정", "이천부발").
// 겹치는 이름은 더 긴 것을 앞에 둠(남양주→양주 오인 방지). '광주'는 광주광역시 혼동으로 제외.
const GG_CITY_STEMS = [
  "남양주", "의정부", "동두천",
  "수원", "성남", "고양", "용인", "화성", "부천", "안산", "안양", "평택", "시흥",
  "파주", "김포", "광명", "군포", "이천", "양주", "오산", "안성", "의왕", "하남",
  "구리", "과천", "포천", "가평", "연천", "양평", "여주",
];
const GG_GUN = new Set(["가평", "연천", "양평"]); // 군 단위(나머지는 시)
const GG_CITY_RE = new RegExp(`(${GG_CITY_STEMS.join("|")})`);

// 서울 자치구 이름(접미사 없이 등장 시 보정: "서울금천" → 금천구).
const SEOUL_GU_STEMS = [
  "종로", "용산", "성동", "광진", "동대문", "중랑", "성북", "강북", "도봉", "노원",
  "은평", "서대문", "마포", "양천", "강서", "구로", "금천", "영등포", "동작", "관악",
  "서초", "강남", "송파", "강동",
];
const SEOUL_GU_RE = new RegExp(`(${SEOUL_GU_STEMS.join("|")})`);

export interface ParsedRegion {
  sido: string | null;
  sigu: string | null;
}

/** 주소/공급위치 문자열에서 시도·시군구를 추출. 별칭을 우선 적용. */
export function parseRegion(text: string | null | undefined): ParsedRegion {
  if (!text) return { sido: null, sigu: null };

  // 1) 시도: 정식명/약어를 길이순(긴 것 우선)으로 탐색 → 표준 약어.
  let sido: string | null = null;
  let matched = "";
  for (const [name, canon] of SIDO_FULL) {
    const i = text.indexOf(name);
    if (i >= 0) {
      sido = canon;
      matched = name;
      break;
    }
  }
  // 매칭된 시도명 + 행정접미사(특별시/광역시/도 등)까지 제거 → '특별시'가 시군구로 오인 방지.
  const rest = matched
    ? text.replace(new RegExp(matched + "(?:특별자치도|특별자치시|특별시|광역시|도)?"), " ")
    : text;

  // 2) 시군구: 별칭 우선 → 정규식(시도 제거 본문).
  let sigu: string | null = null;
  for (const [alias, mapped] of Object.entries(REGION_ALIAS)) {
    if (text.includes(alias)) { sigu = mapped; break; }
  }
  if (!sigu) {
    const m = rest.match(SIGU_RE);
    if (m) sigu = m[1];
  }
  // 2-b) 접미사 없는 수도권 시 이름 (서울 공고 제외) — "양주옥정", "이천부발" 등.
  if (!sigu && sido !== "서울") {
    const c = text.match(GG_CITY_RE);
    if (c) sigu = c[1] + (GG_GUN.has(c[1]) ? "군" : "시");
  }
  // 2-c) 서울 자치구 이름이 접미사 없이 등장 — "서울금천" → 금천구.
  if (!sigu && (sido === "서울" || /서울/.test(text))) {
    const g = text.match(SEOUL_GU_RE);
    if (g) sigu = g[1].endsWith("구") ? g[1] : `${g[1]}구`;
  }

  // 3) 시도 미표기 시 시군구/택지명으로 보조 추론.
  if (!sido) sido = inferSidoFromSigu(sigu, text);

  return { sido, sigu };
}

/** 수도권 시군구/택지명으로 시도 추론(미표기 보강). */
function inferSidoFromSigu(sigu: string | null, text: string): string | null {
  if (sigu && SEOUL_GU.has(sigu)) return "서울";
  if (sigu && GYEONGGI_SIGU.has(sigu)) return "경기";
  if (GYEONGGI_AREA.some((a) => text.includes(a))) return "경기";
  return null;
}
