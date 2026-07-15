// 공용 로딩 스피너. 이동·비동기 작업 중 로딩 상태 표시에 재사용.
// 서버/클라이언트 양쪽에서 렌더 가능(순수 프리젠테이션, 상태 없음).

type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
};

/** 회전 원형 스피너. `label`이 있으면 접근성용 텍스트로 제공(스크린리더). */
export function Spinner({
  size = "md",
  className = "",
  label = "로딩 중",
}: {
  size?: Size;
  className?: string;
  label?: string;
}) {
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label}
      data-testid="spinner"
      className={`inline-block animate-spin rounded-full border-current border-t-transparent align-[-0.125em] ${SIZE[size]} ${className}`}
    />
  );
}

/** 화면/영역 중앙에 스피너 + 안내문. 페이지 이동 로딩(loading.tsx) 등에 사용. */
export function CenteredSpinner({ text = "불러오는 중…" }: { text?: string }) {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-gray-400"
      data-testid="centered-spinner"
    >
      <Spinner size="lg" className="text-blue-600" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
