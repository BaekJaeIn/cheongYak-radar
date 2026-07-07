// 공고분석 `/analyze` (U7, FR-12). RSC shell + client AnalyzePage.
import { AnalyzePage } from "@/features/analyze/AnalyzePage";

export const dynamic = "force-dynamic";

export default function AnalyzeRoutePage() {
  return (
    <section>
      <h1 className="mb-1 text-base font-bold">공고분석</h1>
      <p className="mb-3 text-xs text-gray-500">
        원하는 공고의 PDF로 우리 가구가 지원 가능한지 확인해 보세요.
      </p>
      <AnalyzePage />
    </section>
  );
}
