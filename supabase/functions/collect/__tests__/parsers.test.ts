import { describe, it, expect } from "vitest";
import {
  toIsoDate,
  parseLhSchedule,
  htmlToText,
  parseShList,
  parseShApplyPeriod,
  parseGhCards,
  ghNetFunnelActive,
  ghDetailUrl,
} from "../collectors/parsers.ts";

describe("toIsoDate (FR-17.5)", () => {
  it("출처별 형식을 YYYY-MM-DD로", () => {
    expect(toIsoDate("2026.07.14")).toBe("2026-07-14");
    expect(toIsoDate("20260819")).toBe("2026-08-19");
    expect(toIsoDate("2026-07-14")).toBe("2026-07-14");
    expect(toIsoDate("2026. 10. 6.(화) 10:00")).toBe("2026-10-06");
  });
  it("날짜가 아니면 null", () => {
    expect(toIsoDate(null)).toBeNull();
    expect(toIsoDate("공고문 참조")).toBeNull();
    expect(toIsoDate("26. 9. 23.")).toBeNull();
    expect(toIsoDate("2026.13.01")).toBeNull();
  });
});

describe("parseLhSchedule (FR-17.1)", () => {
  const body = [
    { dsSch: [{ PAN_ID: "1" }] },
    {
      dsSplScdl: [
        { HS_SBSC_ACP_TRG_CD_NM: "일반", ACP_DTTM: "2026.07.22 10:00 ~ 2026.07.23 17:00", PZWR_ANC_DT: "20260820" },
        { HS_SBSC_ACP_TRG_CD_NM: "우선", ACP_DTTM: "2026.07.20 10:00 ~ 2026.07.21 17:00", PZWR_ANC_DT: "20260819" },
      ],
    },
  ];
  it("구분별 행 중 가장 이른 접수 시작일·당첨발표일", () => {
    expect(parseLhSchedule(body)).toEqual({ applyStart: "2026-07-20", winnerDate: "2026-08-19" });
  });
  it("공급일정 없거나 형식 불량이면 null", () => {
    expect(parseLhSchedule([{ dsSch: [] }])).toEqual({ applyStart: null, winnerDate: null });
    expect(parseLhSchedule([{ dsSplScdl: [{ ACP_DTTM: "공고문 참조" }] }])).toEqual({ applyStart: null, winnerDate: null });
    expect(parseLhSchedule({ error: "x" })).toEqual({ applyStart: null, winnerDate: null });
  });
});

describe("htmlToText", () => {
  it("태그·주석·script 제거 + 공백 정규화", () => {
    expect(htmlToText("<p>a<!-- x --> <b>b</b>&nbsp;c</p><script>var z=1</script>")).toBe("a b c");
  });
});

const SH_LEASE = `<table><thead><tr><th>번호</th></tr></thead><tbody>
<tr>
  <td class="td1">80</td>
  <td class="td3">도시형생활주택</td>
  <td class="txl td-m">
    <!--	<a href="/site/main/sh/publicLease/view?seq=3&cp=1"></a>-->
    2026년 신정도시마을 잔여세대 입주자모집공고(26. 9. 23.)
  </td>
  <td class="td4"> 2026-09-23 </td>
  <td class="td-mdisn"> 2026-12-28 </td>
  <td class="td-mdisn">모집중</td>
  <td class="td-mdisn">맞춤주택공급부</td>
  <td class="td5"><a href="https://www.i-sh.co.kr/main/lay2/program/S1T294C295/www/brd/m_241/view.do?seq=310673" class="btn-gray">바로가기</a></td>
</tr>
<tr>
  <td>79</td><td>희망하우징</td><td>2026년 1차 희망하우징</td><td>2026-03-01</td><td>2026-05-01</td><td>모집완료</td><td>부서</td>
  <td><a href="https://www.i-sh.co.kr/main/lay2/program/S1T294C295/www/brd/m_241/view.do?seq=300001">바로가기</a></td>
</tr>
</tbody></table>`;

const SH_SALE = `<tr><td>2</td><td>주택분양</td><td>[정정] 마곡지구 17단지</td><td>2026-03-10</td><td>2026-04-02</td><td>분양부</td>
<td><a href="https://www.i-sh.co.kr/main/lay2/program/S1T294C295/www/brd/m_241/view.do?seq=301479&amp;x=1">바로가기</a></td></tr>
<tr><td>1</td><td>x</td><td>외부 링크</td><td>2026-03-10</td><td>-</td><td>부서</td><td><a href="https://evil.example.com/?seq=1">바로가기</a></td></tr>`;

describe("parseShList (FR-17.2)", () => {
  it("임대 8칸 — 주석 링크 무시, 공고명·게시일·발표일·모집상태·seq", () => {
    const rows = parseShList(SH_LEASE);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      seq: "310673",
      type: "도시형생활주택",
      title: "2026년 신정도시마을 잔여세대 입주자모집공고(26. 9. 23.)",
      postedDate: "2026-09-23",
      announceDate: "2026-12-28",
      status: "모집중",
      link: "https://www.i-sh.co.kr/main/lay2/program/S1T294C295/www/brd/m_241/view.do?seq=310673",
    });
    expect(rows[1].status).toBe("모집완료");
  });
  it("분양 7칸 — 상태 없음, i-sh.co.kr 외 링크 제외, &amp; 해제", () => {
    const rows = parseShList(SH_SALE);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ seq: "301479", status: null, postedDate: "2026-03-10" });
    expect(rows[0].link.endsWith("seq=301479&x=1")).toBe(true);
  });
});

describe("parseShApplyPeriod (FR-17.2)", () => {
  it("■ 접수일 — 범위(공백 섞인 표기)", () => {
    const t = "■ 신청자격: 공고일(26. 9. 23.) 현재 … ■ 접수일 ○ 인터넷접수 - 일반공급 선순위: 2026. 10. 6.(화) 10:00 ~ 2026. 10. 7 .(수 ) 17:00 - 후순위";
    expect(parseShApplyPeriod(t)).toEqual({ applyStart: "2026-10-06", applyEnd: "2026-10-07" });
  });
  it("신청접수 일정 표 — 연도 생략된 종료일", () => {
    const t = "□ 순위별 신청접수 일정 및 신청방법 . 대상자 신청기간 신청방법 1순위(선순위) 2026. 9. 29.(화) 10:00 ~ 10. 2.(금) 17:00";
    expect(parseShApplyPeriod(t)).toEqual({ applyStart: "2026-09-29", applyEnd: "2026-10-02" });
  });
  it("날짜 없는 키워드는 건너뛰고 다음 키워드에서 추출", () => {
    const t = "신청기간 종료 이후 자격사항 변동은 절대 불가합니다. … 공지 … ".repeat(3) + "■ 청약신청 일정 ○ [1 순위 ] 2026. 9. 14.( 월 )";
    expect(parseShApplyPeriod(t)).toEqual({ applyStart: "2026-09-14", applyEnd: null });
  });
  it("접수 일정이 없으면 null", () => {
    expect(parseShApplyPeriod("■ 입주자모집공고일(2026.02.27.) 현재 대출 상품 협의 중")).toEqual({
      applyStart: null,
      applyEnd: null,
    });
  });
});

const ghCard = (no: string, biz: string, cd: string, title: string, period: string) => `
<a class="thbox brd-df apy-c1" href="javascript:void(0);"
  data-previewYn="N"
  data-pbancNo="${no}"
  data-pbancKndCd="01"
  data-bizTyNm="${biz}"
  data-bizTyCd="${cd}"
  >
  <span class="bg-blue_mt">${biz}</span>
  <p class="leading-6 line-clamp-2 max-h-[46px] my-2">${title}
  </p>
  <p class="calender_box">
    <span class="">
      신청기간
        ${period}
    </span>
  </p>
  <span class="status-off">접수마감</span>
</a>`;

describe("parseGhCards (FR-17.3)", () => {
  const html =
    ghCard("809", "행복주택", "01", "안양냉천 지구내 주민", "2026-07-21 ~ 2026-07-24") +
    ghCard("809", "행복주택", "01", "안양냉천 지구내 주민", "2026-07-21 ~ 2026-07-24") +
    ghCard("822", "상가임대", "07", "안성청사복합 임대상가", "2026-10-01 ~ 2026-10-01") +
    ghCard("811", "행복주택", "01", "연천BIX 기숙사 추가모집", "2026-09-01 ~") +
    ghCard("812", "매입임대", "06", "[추가모집] 26년 GH 특화형 매입임대주택", " ~ ");

  it("신청기간 시작·마감, 중복 제거, 상가 제외", () => {
    const cards = parseGhCards(html);
    expect(cards.map((c) => c.pbancNo)).toEqual(["809", "811", "812"]);
    expect(cards[0]).toEqual({
      pbancNo: "809",
      bizTyNm: "행복주택",
      bizTyCd: "01",
      title: "안양냉천 지구내 주민",
      applyStart: "2026-07-21",
      applyEnd: "2026-07-24",
    });
    expect(cards[1]).toMatchObject({ applyStart: "2026-09-01", applyEnd: null });
    expect(cards[2]).toMatchObject({ applyStart: null, applyEnd: null });
  });

  it("상세 URL — bizTyCd별 경로", () => {
    expect(ghDetailUrl({ pbancNo: "812", bizTyCd: "06" })).toBe(
      "https://apply.gh.or.kr/sb/sr/sr7155/selectPbancDetailView.do?pbancNo=812",
    );
    expect(ghDetailUrl({ pbancNo: "809", bizTyCd: "01" })).toBe(
      "https://apply.gh.or.kr/sb/sr/sr7150/selectPbancDetailView.do?pbancNo=809",
    );
  });

  it("NetFunnel — 주석 처리는 비활성", () => {
    expect(ghNetFunnelActive("// NetFunnel_Action({}, fn)")).toBe(false);
    expect(ghNetFunnelActive("  NetFunnel_Action({}, fn)")).toBe(true);
  });
});
