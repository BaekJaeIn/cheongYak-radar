// U7 공고분석 결과 표시 (C34, FR-12.5). 판정 배지 + 사유 + 추출 기준 병기 + 고지.
import type { ExtractedNotice, MatchResult, MatchStatus } from "./types";

const STATUS_LABEL: Record<MatchStatus, string> = {
  eligible: "가능",
  conditional: "조건부",
  ineligible: "불가",
};
// NFR-7: 색 + 텍스트 병기
const STATUS_STYLE: Record<MatchStatus, string> = {
  eligible: "bg-green-100 text-green-800",
  conditional: "bg-amber-100 text-amber-800",
  ineligible: "bg-gray-200 text-gray-600",
};

function won(v: number): string {
  if (v >= 100000000) {
    const eok = v / 100000000;
    return `${Number.isInteger(eok) ? eok : eok.toFixed(1)}억원`;
  }
  return `${Math.round(v / 10000).toLocaleString()}만원`;
}

/** null 필드는 "공고에서 확인 불가"로 명시 (D-2 — 추측값 없음). */
const UNKNOWN = "공고에서 확인 불가";

export function AnalyzeResultView({
  extracted,
  match,
  disclaimer,
}: {
  extracted: ExtractedNotice;
  match: MatchResult;
  disclaimer: string;
}) {
  const e = extracted.eligibility;
  const criteriaRows: { label: string; value: string | null }[] = [
    { label: "소득 기준", value: e.incomePctLimit ? `도시근로자 월평균소득 ${e.incomePctLimit}% 이하` : null },
    { label: "총자산 한도", value: e.assetLimit ? won(e.assetLimit) : null },
    { label: "자동차가액 한도", value: e.carLimit ? won(e.carLimit) : null },
    { label: "거주 요건", value: e.residencyReq ? `${e.residencyReq.region} ${e.residencyReq.months}개월 이상` : null },
    { label: "청약통장", value: e.savingsReq ? `가입 ${e.savingsReq.months}개월·납입 ${e.savingsReq.count}회 이상` : null },
    { label: "예비신혼부부", value: e.preNewlywedAllowed === undefined ? null : e.preNewlywedAllowed ? "신청 가능" : "신청 불가" },
  ];

  return (
    <div className="flex flex-col gap-3" data-testid="analyze-result">
      {/* 공급유형별 판정 */}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold">{extracted.title ?? "업로드한 공고"}</h2>
        <p className="mb-3 text-xs text-gray-500">
          {[extracted.regionSido, extracted.regionSigu].filter(Boolean).join(" ") || UNKNOWN}
          {extracted.applyStart && ` · 접수 ${extracted.applyStart}${extracted.applyEnd ? ` ~ ${extracted.applyEnd}` : ""}`}
        </p>
        {match.perSupplyType.length === 0 ? (
          <p className="text-sm text-gray-500">판정할 공급유형을 공고에서 찾지 못했어요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {match.perSupplyType.map((m) => (
              <li key={m.type} className="rounded-lg border p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[m.status]}`}>
                    {STATUS_LABEL[m.status]}
                  </span>
                  <span className="text-sm font-medium">{m.type}</span>
                </div>
                {m.reasons.length > 0 && (
                  <ul className="list-inside list-disc text-xs text-gray-600">
                    {m.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 추출 기준 병기 — 원문 대조용 (BR-U7-5) */}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">공고에서 추출한 기준</h2>
        <dl className="flex flex-col gap-1">
          {criteriaRows.map((row) => (
            <div key={row.label} className="flex justify-between gap-2 text-xs">
              <dt className="shrink-0 text-gray-500">{row.label}</dt>
              <dd className={`text-right ${row.value ? "text-gray-800" : "text-gray-400"}`}>
                {row.value ?? UNKNOWN}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="text-xs text-amber-700">⚠️ {disclaimer}</p>
    </div>
  );
}
