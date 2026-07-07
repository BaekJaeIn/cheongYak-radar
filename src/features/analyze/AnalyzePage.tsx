"use client";
// 공고분석 업로드 화면 (C33, FR-12). 미저장 — 상태는 메모리만 (BR-U7-6).
import { useRef, useState } from "react";
import Link from "next/link";
import type { AnalyzeOutcome } from "./types";
import { validatePdfFile } from "./validate";
import { AnalyzeResultView } from "./AnalyzeResultView";

type Status = "idle" | "uploading" | "done" | "error";

export function AnalyzePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<Extract<AnalyzeOutcome, { ok: true }> | null>(null);
  const [message, setMessage] = useState("");
  const [profileMissing, setProfileMissing] = useState(false);

  function onSelect(f: File | null) {
    setResult(null);
    setMessage("");
    setProfileMissing(false);
    if (!f) {
      setFile(null);
      setStatus("idle");
      return;
    }
    const check = validatePdfFile(f);
    if (!check.ok) {
      setFile(null);
      setStatus("error");
      setMessage(check.message); // BR-U7-1: 업로드 없이 즉시 안내
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(f);
    setStatus("idle");
  }

  async function submit() {
    if (!file || status === "uploading") return;
    setStatus("uploading");
    setMessage("");
    setProfileMissing(false);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/analyze", { method: "POST", body: form });
      const outcome = (await res.json().catch(() => null)) as AnalyzeOutcome | null;
      if (!outcome) throw new Error("응답 파싱 실패");
      if (outcome.ok) {
        setResult(outcome);
        setStatus("done");
      } else {
        setProfileMissing(outcome.code === "profileMissing"); // BR-U7-7
        setMessage(outcome.message);
        setStatus("error");
      }
    } catch {
      setMessage("분석 실패 — 잠시 후 다시 시도해 주세요."); // BR-U7-8
      setStatus("error");
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setMessage("");
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-3">
      {status !== "done" && (
        <section className="rounded-xl border bg-white p-4">
          <p className="mb-3 text-xs text-gray-500">
            청약 공고 PDF를 올리면 내 프로필 기준으로 지원 가능 여부를 판정해 드려요. (PDF, 3MB 이하)
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={(ev) => onSelect(ev.target.files?.[0] ?? null)}
            className="mb-3 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700"
            data-testid="analyze-upload-input"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!file || status === "uploading"}
            className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white disabled:bg-gray-300"
            data-testid="analyze-submit-button"
          >
            {status === "uploading" ? "분석 중… (최대 1분)" : "지원 가능한지 분석"}
          </button>
          {status === "error" && message && (
            <p className="mt-2 text-xs text-red-600">
              {message}
              {profileMissing && (
                <>
                  {" "}
                  <Link href="/settings" className="font-medium text-blue-700 underline">
                    내 프로필 입력하기
                  </Link>
                </>
              )}
            </p>
          )}
        </section>
      )}

      {status === "done" && result && (
        <>
          <AnalyzeResultView
            extracted={result.extracted}
            match={result.match}
            disclaimer={result.disclaimer}
          />
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border py-2 text-sm font-medium text-gray-700"
            data-testid="analyze-reset-button"
          >
            다른 공고 분석하기
          </button>
        </>
      )}
    </div>
  );
}
