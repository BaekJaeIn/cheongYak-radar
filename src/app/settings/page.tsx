// 프로필 입력 `/settings` (US-6.1). RSC shell + client ProfileForm. v6: 계정·로그아웃 (FR-13.4).
import { ProfileForm } from "@/features/profile/ProfileForm";
import { LogoutButton } from "@/features/auth/LogoutButton";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <section>
      <h1 className="mb-1 text-base font-bold">내 프로필</h1>
      <p className="mb-3 text-xs text-gray-500">
        청약 자격·순위 판단에 쓰입니다. 모르는 항목은 비워둬도 돼요. 저장하면 추천이 갱신됩니다.
      </p>
      <ProfileForm />
      <LogoutButton />
    </section>
  );
}
