// C20 — 원문 링크 (US-4.4).
export function SourceLink({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl bg-gray-800 py-3 text-center text-sm font-semibold text-white"
      data-testid="source-link"
    >
      원문 공고 보기 ↗
    </a>
  );
}
