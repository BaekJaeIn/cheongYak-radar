// 라우트 전환 로딩 UI(App Router Suspense fallback). 루트에 두면 하위 모든
// 페이지 이동(탭·카드→상세·로그인→홈)에서 서버 렌더가 끝날 때까지 스피너 표시.
import { CenteredSpinner } from "@/features/ui/Spinner";

export default function Loading() {
  return <CenteredSpinner />;
}
