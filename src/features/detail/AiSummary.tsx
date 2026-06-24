// C19 — AI 자격요약 (US-4.3). 저장된 eligibility_summary 표시(없으면 렌더 안 함).
export function AiSummary({ summary }: { summary: string | null }) {
  if (!summary) return null;
  return (
    <section className="rounded-xl border border-blue-100 bg-blue-50 p-4" data-testid="ai-summary">
      <h2 className="mb-1 text-sm font-semibold text-blue-800">AI 자격요약</h2>
      <p className="whitespace-pre-line text-sm text-gray-700">{summary}</p>
      <p className="mt-2 text-[11px] text-gray-400">AI가 요약한 내용입니다. 실제 신청 전 공고 원문을 확인하세요.</p>
    </section>
  );
}
