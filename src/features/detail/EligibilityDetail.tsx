// C31 확장 — 자격 판정 상세 (US-6.3, BR-U4-3).
import Link from "next/link";
import type { EligibilityCriteria } from "@/lib/types/notice";
import type { FeedRec } from "@/features/recommendations/types";
import { summarizeCriteria } from "./criteria-text";

export function EligibilityDetail({
  rec,
  eligibility,
}: {
  rec: FeedRec | null;
  eligibility: EligibilityCriteria | null;
}) {
  const lines = summarizeCriteria(eligibility);
  return (
    <section className="rounded-xl border bg-white p-4" data-testid="eligibility-detail">
      <h2 className="mb-2 text-sm font-semibold">우리 자격</h2>
      {rec ? (
        <>
          {rec.reasonSummary && <p className="text-sm text-gray-700">{rec.reasonSummary}</p>}
          {rec.eligibleTypes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {rec.eligibleTypes.map((t) => (
                <span key={t} className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800">
                  {t}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-600">
          현재 추천 대상이 아니에요.{" "}
          <Link href="/settings" className="text-blue-700 underline">
            내 프로필
          </Link>
          을 확인해 보세요.
        </p>
      )}

      {lines.length > 0 && (
        <div className="mt-3 border-t pt-3">
          <p className="mb-1 text-xs font-medium text-gray-500">공고 자격조건</p>
          <ul className="list-inside list-disc text-xs text-gray-600">
            {lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
