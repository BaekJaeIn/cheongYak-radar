"use client";
// 로그아웃 + 로그인 계정 표시 (v6 FR-13.4). 설정 페이지 하단에 배치.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";

export function LogoutButton() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getBrowserClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function onLogout() {
    if (busy) return;
    setBusy(true);
    try {
      await getBrowserClient().auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 flex items-center justify-between rounded-xl border bg-white p-4">
      <div>
        <p className="text-xs text-gray-500">로그인 계정</p>
        <p className="text-sm font-medium" data-testid="account-email">
          {email ?? "…"}
        </p>
      </div>
      <button
        type="button"
        onClick={onLogout}
        disabled={busy}
        className="rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        data-testid="logout-btn"
      >
        {busy ? "로그아웃 중…" : "로그아웃"}
      </button>
    </div>
  );
}
