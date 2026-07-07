import { describe, it, expect } from "vitest";
import { authErrorMessage } from "@/features/auth/errors";

describe("authErrorMessage (v6 C38) — Supabase Auth 오류 한국어 매핑", () => {
  it("잘못된 자격증명", () => {
    expect(authErrorMessage("Invalid login credentials")).toBe(
      "이메일 또는 비밀번호가 올바르지 않아요.",
    );
  });
  it("이미 가입된 이메일", () => {
    expect(authErrorMessage("User already registered")).toBe(
      "이미 가입된 이메일이에요. 로그인해 주세요.",
    );
  });
  it("비밀번호 길이", () => {
    expect(authErrorMessage("Password should be at least 6 characters")).toBe(
      "비밀번호는 6자 이상이어야 해요.",
    );
  });
  it("이메일 형식", () => {
    expect(authErrorMessage("Unable to validate email address: invalid format")).toBe(
      "이메일 형식을 확인해 주세요.",
    );
  });
  it("이메일 미확인", () => {
    expect(authErrorMessage("Email not confirmed")).toBe(
      "이메일 확인이 필요해요. 받은편지함을 확인해 주세요.",
    );
  });
  it("레이트리밋", () => {
    expect(authErrorMessage("email rate limit exceeded")).toBe(
      "요청이 너무 잦아요 — 잠시 후 다시 시도해 주세요.",
    );
  });
  it("알 수 없는 오류/undefined는 공통 메시지", () => {
    expect(authErrorMessage("something weird")).toBe(
      "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
    );
    expect(authErrorMessage(undefined)).toBe(
      "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
    );
  });
});
