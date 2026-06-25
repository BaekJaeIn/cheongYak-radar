// data.go.kr 실제 응답 필드명 확인용 프로브 (일회성).
// 키는 절대 출력하지 않음. 환경변수 DATA_GO_KR_API_KEY 사용.
//   실행:  DATA_GO_KR_API_KEY="<발급키>" node scripts/probe-datagokr.mjs
// 출력:  각 엔드포인트의 HTTP 상태 + 첫 행의 "필드명: 값(일부)" 목록.

const KEY = process.env.DATA_GO_KR_API_KEY;
if (!KEY) {
  console.error("DATA_GO_KR_API_KEY 환경변수가 없습니다.");
  process.exit(1);
}

const TARGETS = [
  {
    name: "청약홈 분양정보 (15098547)",
    endpoint:
      "https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail",
  },
  {
    name: "마이홈 단지정보 (15110581)",
    endpoint:
      "https://api.odcloud.kr/api/MyHomePublicLeaseComplexSvc/v1/getPublicLeaseComplexList",
  },
];

// odcloud는 보통 "Decoding 키 + 인코딩 안 함" 또는 "Encoding 키 + 인코딩됨"이 맞음.
// 둘 다 시도해서 어느 쪽이 통하는지 알려줌.
const VARIANTS = [
  { label: "raw(키 그대로)", enc: (k) => k },
  { label: "encoded(URL 인코딩)", enc: (k) => encodeURIComponent(k) },
];

function clip(v) {
  if (v == null) return String(v);
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > 40 ? s.slice(0, 40) + "…" : s;
}

for (const t of TARGETS) {
  console.log("\n========================================");
  console.log("▶", t.name);
  let done = false;
  for (const variant of VARIANTS) {
    if (done) break;
    const url = `${t.endpoint}?serviceKey=${variant.enc(KEY)}&page=1&perPage=5`;
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const text = await res.text();
      console.log(`  [${variant.label}] HTTP ${res.status}`);
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        // XML 에러응답 등
        console.log("    (JSON 아님) 응답 일부:", clip(text));
        continue;
      }
      const rows = json?.data;
      if (!Array.isArray(rows)) {
        console.log("    data 배열 없음. 응답키:", Object.keys(json || {}).join(", "));
        console.log("    응답 일부:", clip(text));
        continue;
      }
      console.log(`    ✅ 동작! totalCount=${json.totalCount ?? "?"}, 받은행=${rows.length}`);
      console.log(`    ⇒ 이 키 방식 사용: ${variant.label}`);
      if (rows[0]) {
        console.log("    --- 첫 행 필드 ---");
        for (const [k, v] of Object.entries(rows[0])) {
          console.log(`      ${k}: ${clip(v)}`);
        }
      }
      done = true;
    } catch (e) {
      console.log(`  [${variant.label}] 요청 실패:`, e.message);
    }
  }
  if (!done) console.log("  ⚠️ 두 방식 모두 실패 — 키 종류/활용신청 승인 상태 확인 필요");
}
console.log("\n========================================");
console.log("완료. 위 출력(키 값 없음)을 그대로 공유해 주세요.");
