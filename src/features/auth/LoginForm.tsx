"use client";
// C38 로그인/가입/비밀번호 재설정 3모드 폼 (v6 FR-13.1~13.4).
// 비밀번호는 Supabase Auth SDK로만 전달 — 앱 저장·로깅 없음 (BR-U8-3).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";
import { authErrorMessage } from "./errors";

type Mode = "login" | "signup" | "reset";
type Status = "idle" | "submitting" | "resetSent";

const TITLE: Record<Mode, string> = {
  login: "로그인",
  signup: "회원가입",
  reset: "비밀번호 재설정",
};

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  function switchMode(next: Mode) {
    setMode(next);
    setMessage("");
    setStatus("idle");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setMessage("");
    const auth = getBrowserClient().auth;
    try {
      if (mode === "reset") {
        const { error } = await auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        if (error) throw error;
        setStatus("resetSent");
        setMessage("재설정 메일을 보냈어요. 받은편지함을 확인해 주세요.");
        return;
      }
      const { error } =
        mode === "login"
          ? await auth.signInWithPassword({ email, password })
          : await auth.signUp({ email, password });
      if (error) throw error;
      router.push("/");
      router.refresh();
    } catch (err) {
      setStatus("idle");
      setMessage(authErrorMessage((err as Error).message));
    }
  }

  const field = "mt-1 w-full rounded border px-2 py-1.5 text-sm";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" data-testid="login-form">
      <div className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">{TITLE[mode]}</h2>
        <label className="text-xs font-medium text-gray-600">이메일</label>
        <input
          type="email"
          required
          autoComplete="email"
          className={field}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-testid="login-email"
        />
        {mode !== "reset" && (
          <>
            <label className="mt-2 block text-xs font-medium text-gray-600">비밀번호</label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className={field}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="login-password"
            />
          </>
        )}
        <button
          type="submit"
          disabled={status === "submitting"}
          className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white disabled:bg-gray-300"
          data-testid="login-submit"
        >
          {status === "submitting" ? "처리 중…" : TITLE[mode]}
        </button>
        {message && (
          <p
            className={`mt-2 text-xs ${status === "resetSent" ? "text-green-700" : "text-red-600"}`}
            data-testid="login-message"
          >
            {message}
          </p>
        )}
      </div>

      <div className="flex justify-center gap-4 text-xs text-gray-600">
        {mode !== "login" && (
          <button type="button" className="underline" onClick={() => switchMode("login")}>
            로그인
          </button>
        )}
        {mode !== "signup" && (
          <button
            type="button"
            className="underline"
            onClick={() => switchMode("signup")}
            data-testid="login-mode-signup"
          >
            회원가입
          </button>
        )}
        {mode !== "reset" && (
          <button
            type="button"
            className="underline"
            onClick={() => switchMode("reset")}
            data-testid="login-reset"
          >
            비밀번호 재설정
          </button>
        )}
      </div>
    </form>
  );
}
