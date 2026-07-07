// Supabase Auth 오류 → 한국어 메시지 (순수, 테스트 대상). v6 C38.
export function authErrorMessage(raw: string | undefined): string {
  const m = (raw ?? "").toLowerCase();
  if (m.includes("invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않아요.";
  if (m.includes("user already registered")) return "이미 가입된 이메일이에요. 로그인해 주세요.";
  if (m.includes("password should be at least")) return "비밀번호는 6자 이상이어야 해요.";
  if (m.includes("email") && m.includes("invalid")) return "이메일 형식을 확인해 주세요.";
  if (m.includes("email not confirmed")) return "이메일 확인이 필요해요. 받은편지함을 확인해 주세요.";
  if (m.includes("rate limit")) return "요청이 너무 잦아요 — 잠시 후 다시 시도해 주세요.";
  return "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
}
