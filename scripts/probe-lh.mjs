// LH 분양임대 공고문(15058530) 실응답 확인. 키 미출력. raw 구조 덤프.
//   실행:  DATA_GO_KR_API_KEY="<발급키>" node scripts/probe-lh.mjs
// 403 Forbidden 대응: User-Agent 헤더 추가 + 엔드포인트/오퍼레이션 후보 시도.

const KEY = process.env.DATA_GO_KR_API_KEY;
if (!KEY) { console.error("DATA_GO_KR_API_KEY 없음"); process.exit(1); }

const HOST = "apis.data.go.kr/B552555";
const COMMON = "PG_SZ=5&PAGE=1&PAN_NT_ST_DT=20260101&CLSG_DT=20261231";
const HEADERS = {
  "Accept": "application/json",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
};

// 경로 후보(서비스/오퍼레이션) × 키 방식
const PATHS = [
  "lhLeaseNoticeInfo1/lhLeaseNoticeInfo1",
  "lhLeaseNoticeInfo1/getLeaseNoticeInfo1",
  "lhLeaseNoticeInfo/lhLeaseNoticeInfo",
];
const KEYMODES = [
  { label: "raw",  k: () => KEY },
  { label: "enc",  k: () => encodeURIComponent(KEY) },
];

function clip(s, n = 2500) { s = String(s); return s.length > n ? s.slice(0, n) + "…(생략)" : s; }

let ok = false;
outer:
for (const path of PATHS) {
  for (const km of KEYMODES) {
    for (const scheme of ["https", "http"]) {
      const url = `${scheme}://${HOST}/${path}?serviceKey=${km.k()}&${COMMON}`;
      try {
        const res = await fetch(url, { headers: HEADERS });
        const text = await res.text();
        const head = (text.trim()[0] ?? "");
        const isData = res.status === 200 && (head === "{" || head === "[") &&
          !/errMsg|등록되지|SERVICE_KEY|returnReasonCode|Forbidden/i.test(text);
        console.log(`· ${res.status} ${scheme} ${path} [${km.label}] ${isData ? "✅데이터" : clip(text, 60).replace(/\s+/g, " ")}`);
        if (isData) {
          console.log("\n✅✅ 동작!");
          console.log("  URL(키 제외):", `${scheme}://${HOST}/${path}?...&${COMMON}`);
          console.log("  키 방식:", km.label);
          console.log("  --- 응답(raw, 일부) ---");
          console.log(clip(text));
          ok = true;
          break outer;
        }
      } catch (e) {
        console.log(`· ERR ${scheme} ${path} [${km.label}]: ${e.message}`);
      }
    }
  }
}
console.log(ok
  ? "\n위 응답을 그대로 공유해 주세요. 매핑 확정하겠습니다."
  : "\n동작 후보 없음. 모두 403/Forbidden이면 (a)활용신청 승인 대기 또는 (b)요청주소 상이.\n→ data.go.kr 15058530 상세에서 '미리보기' 실행 후 열린 브라우저의 URL(서비스키 값은 지우고)을 공유해 주세요.");
