// 생활권명 → 행정구역 별칭 + 주소 파싱 (순수, BR-U1-2)
// Deno/Node 공통 (외부 의존 없음 → vitest 테스트 가능)

/** 생활권/택지지구 통칭을 시군구로 매핑. */
export const REGION_ALIAS: Record<string, string> = {
  평촌: "안양시",
  인덕원: "안양시",
  산본: "군포시",
  백운밸리: "의왕시",
  포일: "의왕시",
  과천지식정보타운: "과천시",
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
