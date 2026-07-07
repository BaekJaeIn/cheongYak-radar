// 로그인/가입 `/login` (v6 U8). 미로그인 시 유일하게 접근 가능한 화면 (BR-U8-1).
import { LoginForm } from "@/features/auth/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <section>
      <h1 className="mb-1 text-base font-bold">청약레이더</h1>
      <p className="mb-3 text-xs text-gray-500">
        회원별 가구 프로필로 청약 공고를 추천해 드려요. 로그인 후 이용할 수 있습니다.
      </p>
      <LoginForm />
    </section>
  );
}
