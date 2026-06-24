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

const SIDO_RE =
  /(서울|경기|인천|부산|대구|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)(?:특별시|광역시|특별자치시|특별자치도|도)?/;
const SIGU_RE = /([가-힣]{2,}(?:시|군|구))/;

export interface ParsedRegion {
  sido: string | null;
  sigu: string | null;
}

/** 주소/공급위치 문자열에서 시도·시군구를 추출. 별칭을 우선 적용. */
export function parseRegion(text: string | null | undefined): ParsedRegion {
  if (!text) return { sido: null, sigu: null };

  // 시도를 먼저 추출하고 본문에서 제거 → "서울특별시"가 시군구로 오인되지 않도록.
  const sm = text.match(SIDO_RE);
  let sido = sm ? sm[1] : null;
  const rest = sm ? text.replace(sm[0], " ") : text;

  let sigu: string | null = null;
  // 1) 별칭 우선 (생활권명)
  for (const [alias, mapped] of Object.entries(REGION_ALIAS)) {
    if (text.includes(alias)) {
      sigu = mapped;
      break;
    }
  }
  // 2) 정규식 시군구 (시도 제거한 본문에서)
  if (!sigu) {
    const m = rest.match(SIGU_RE);
    if (m) sigu = m[1];
  }

  // 시도 미표기 시 관심지역으로 보조 추론
  if (!sido && sigu) sido = inferSidoFromSigu(sigu);

  return { sido, sigu };
}

/** 관심 지역 한정 보조 추론(시도 미표기 시). */
function inferSidoFromSigu(sigu: string): string | null {
  const GYEONGGI = ["안양시", "군포시", "의왕시", "과천시", "안산시", "수원시", "성남시"];
  if (GYEONGGI.includes(sigu)) return "경기";
  return null;
}
