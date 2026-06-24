// 추천 사유 (C32, BR-U3-4). 네이티브 <details>로 펼침(무JS).

export function MatchReason({
  reasonSummary,
  eligibleTypes,
}: {
  reasonSummary: string | null;
  eligibleTypes: string[];
}) {
  if (!reasonSummary && eligibleTypes.length === 0) return null;
  return (
    <details className="mt-1 text-xs text-gray-600" data-testid="match-reason">
      <summary className="cursor-pointer text-blue-700">
        {reasonSummary ?? "추천 사유 보기"}
      </summary>
      {eligibleTypes.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {eligibleTypes.map((t) => (
            <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5">
              {t}
            </span>
          ))}
        </div>
      )}
    </details>
  );
}
