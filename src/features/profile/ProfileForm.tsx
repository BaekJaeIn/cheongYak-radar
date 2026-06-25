"use client";
// 가구 프로필 입력 폼 (C29, US-6.1/6.2, Q-FU3-2=A 단일 폼).
// GET/PUT /api/profile (서버 service_role). 민감정보는 API만 경유.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { HouseholdProfile, MaritalStatus } from "@/lib/types/profile";
import { ALL_SOURCES, SOURCE_LABEL, type SourceType } from "@/lib/types/notice";

function emptyProfile(): HouseholdProfile {
  return {
    maritalStatus: "pre_newlywed",
    homeless: true,
    headOfHousehold: true,
    children: 0,
    members: 2,
    self: { birthYear: 0, monthlyIncome: 0 },
    partner: { birthYear: 0, monthlyIncome: 0 },
    assets: { financial: 0, carValue: 0 },
    residence: { sido: "", sigu: "", since: "" },
    partnerResidence: { sido: "", sigu: "", since: "" },
    firstTimeBuyer: true,
    preferences: { regions: [], sources: [...ALL_SOURCES] },
  };
}

const MARITAL: { v: MaritalStatus; label: string }[] = [
  { v: "single", label: "미혼" },
  { v: "pre_newlywed", label: "예비신혼" },
  { v: "newlywed", label: "신혼(혼인신고)" },
  { v: "married", label: "기혼" },
];

type Status = "idle" | "loading" | "saving" | "saved" | "error";

export function ProfileForm() {
  const router = useRouter();
  const [p, setP] = useState<HouseholdProfile>(emptyProfile());
  const [regionsText, setRegionsText] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false); // 저장 성공 시 '추천 보러가기' 노출

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d?.profile) {
          setP({ ...emptyProfile(), ...d.profile });
          setRegionsText((d.profile.preferences?.regions ?? []).join(", "));
        }
        setStatus("idle");
      })
      .catch(() => setStatus("idle"));
  }, []);

  function num(v: string): number {
    const n = Number(v.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage("");
    setSaved(false);
    const profile: HouseholdProfile = {
      ...p,
      preferences: {
        ...p.preferences,
        regions: regionsText.split(",").map((s) => s.trim()).filter(Boolean),
      },
    };
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "저장 실패");

      const rec = data?.recompute as
        | { ok: boolean; recommended?: number; error?: string }
        | undefined;
      setStatus("saved");
      setSaved(true);
      if (rec && rec.ok) {
        setMessage(
          rec.recommended != null
            ? `저장 완료! 추천 ${rec.recommended}건을 새로 계산했어요.`
            : "저장 완료! 추천을 갱신했어요.",
        );
      } else if (rec && !rec.ok) {
        // 저장은 됐지만 추천 갱신이 안 된 경우 — 원인을 그대로 노출(과거엔 조용히 실패)
        setMessage(`저장은 됐지만 추천 갱신은 실패했어요: ${rec.error ?? "알 수 없는 오류"}`);
      } else {
        setMessage("저장 완료!");
      }
      // 피드(서버 컴포넌트) 데이터 재요청 — 다음 이동 시 최신 추천 반영
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMessage((err as Error).message);
    }
  }

  const partnerRes = p.partnerResidence ?? { sido: "", sigu: "", since: "" };
  function setPartnerRes(patch: Partial<{ sido: string; sigu: string; since: string }>) {
    setP((cur) => ({
      ...cur,
      partnerResidence: { ...(cur.partnerResidence ?? { sido: "", sigu: "", since: "" }), ...patch },
    }));
  }

  function toggleSource(s: SourceType) {
    setP((cur) => {
      const has = cur.preferences.sources.includes(s);
      return {
        ...cur,
        preferences: {
          ...cur.preferences,
          sources: has
            ? cur.preferences.sources.filter((x) => x !== s)
            : [...cur.preferences.sources, s],
        },
      };
    });
  }

  const field = "mt-1 w-full rounded border px-2 py-1.5 text-sm";
  const label = "text-xs font-medium text-gray-600";
  const section = "rounded-xl border bg-white p-4";

  if (status === "loading") return <p className="text-sm text-gray-500">불러오는 중…</p>;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" data-testid="profile-form">
      {/* 혼인/세대 */}
      <div className={section}>
        <h2 className="mb-2 text-sm font-semibold">혼인 · 세대</h2>
        <label className={label}>혼인 상태</label>
        <select
          className={field}
          value={p.maritalStatus}
          onChange={(e) => setP({ ...p, maritalStatus: e.target.value as MaritalStatus })}
          data-testid="profile-maritalStatus"
        >
          {MARITAL.map((m) => (
            <option key={m.v} value={m.v}>{m.label}</option>
          ))}
        </select>
        <div className="mt-2 flex gap-3">
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={p.homeless}
              onChange={(e) => setP({ ...p, homeless: e.target.checked })}
              data-testid="profile-homeless"
            />
            무주택
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={p.firstTimeBuyer}
              onChange={(e) => setP({ ...p, firstTimeBuyer: e.target.checked })}
            />
            생애최초
          </label>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <label className={label}>세대원 수</label>
            <input type="number" className={field} value={p.members}
              onChange={(e) => setP({ ...p, members: num(e.target.value) })} data-testid="profile-members" />
          </div>
          <div>
            <label className={label}>자녀 수</label>
            <input type="number" className={field} value={p.children}
              onChange={(e) => setP({ ...p, children: num(e.target.value) })} />
          </div>
        </div>
      </div>

      {/* 소득 */}
      <div className={section}>
        <h2 className="mb-2 text-sm font-semibold">소득 (세전 월, 원)</h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={label}>본인</label>
            <input type="number" className={field} value={p.self.monthlyIncome || ""}
              onChange={(e) => setP({ ...p, self: { ...p.self, monthlyIncome: num(e.target.value) } })}
              data-testid="profile-self-income" />
          </div>
          <div>
            <label className={label}>배우자</label>
            <input type="number" className={field} value={p.partner.monthlyIncome || ""}
              onChange={(e) => setP({ ...p, partner: { ...p.partner, monthlyIncome: num(e.target.value) } })} />
          </div>
        </div>
      </div>

      {/* 청약통장 */}
      <div className={section}>
        <h2 className="mb-2 text-sm font-semibold">청약통장 납입횟수</h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={label}>본인</label>
            <input type="number" className={field} value={p.self.savingsAccount?.count ?? ""}
              onChange={(e) => setP({ ...p, self: { ...p.self, savingsAccount: { type: p.self.savingsAccount?.type ?? "주택청약종합저축", count: num(e.target.value), amount: p.self.savingsAccount?.amount ?? 0 } } })} />
          </div>
          <div>
            <label className={label}>배우자</label>
            <input type="number" className={field} value={p.partner.savingsAccount?.count ?? ""}
              onChange={(e) => setP({ ...p, partner: { ...p.partner, savingsAccount: { type: p.partner.savingsAccount?.type ?? "주택청약종합저축", count: num(e.target.value), amount: p.partner.savingsAccount?.amount ?? 0 } } })} />
          </div>
        </div>
      </div>

      {/* 자산 */}
      <div className={section}>
        <h2 className="mb-2 text-sm font-semibold">자산 (원)</h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={label}>금융자산</label>
            <input type="number" className={field} value={p.assets.financial || ""}
              onChange={(e) => setP({ ...p, assets: { ...p.assets, financial: num(e.target.value) } })} />
          </div>
          <div>
            <label className={label}>자동차가액</label>
            <input type="number" className={field} value={p.assets.carValue || ""}
              onChange={(e) => setP({ ...p, assets: { ...p.assets, carValue: num(e.target.value) } })} />
          </div>
        </div>
      </div>

      {/* 거주 — 본인 */}
      <div className={section}>
        <h2 className="mb-2 text-sm font-semibold">본인 거주지</h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={label}>시도</label>
            <input className={field} value={p.residence.sido} placeholder="경기"
              onChange={(e) => setP({ ...p, residence: { ...p.residence, sido: e.target.value } })} />
          </div>
          <div>
            <label className={label}>시군구</label>
            <input className={field} value={p.residence.sigu} placeholder="부천시"
              onChange={(e) => setP({ ...p, residence: { ...p.residence, sigu: e.target.value } })} />
          </div>
        </div>
        <label className={label}>전입일</label>
        <input type="date" className={field} value={p.residence.since}
          onChange={(e) => setP({ ...p, residence: { ...p.residence, since: e.target.value } })}
          data-testid="profile-since" />
      </div>

      {/* 거주 — 여자친구(배우자) */}
      <div className={section}>
        <h2 className="mb-1 text-sm font-semibold">여자친구 거주지</h2>
        <p className="mb-2 text-xs text-gray-500">해당지역 우선공급 판정에 본인 거주지와 함께 반영돼요.</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={label}>시도</label>
            <input className={field} value={partnerRes.sido} placeholder="서울"
              onChange={(e) => setPartnerRes({ sido: e.target.value })}
              data-testid="profile-partner-sido" />
          </div>
          <div>
            <label className={label}>시군구</label>
            <input className={field} value={partnerRes.sigu} placeholder="강서구"
              onChange={(e) => setPartnerRes({ sigu: e.target.value })}
              data-testid="profile-partner-sigu" />
          </div>
        </div>
        <label className={label}>전입일</label>
        <input type="date" className={field} value={partnerRes.since}
          onChange={(e) => setPartnerRes({ since: e.target.value })}
          data-testid="profile-partner-since" />
      </div>

      {/* 희망조건 */}
      <div className={section}>
        <h2 className="mb-2 text-sm font-semibold">희망 조건</h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={label}>전용면적 최소(㎡)</label>
            <input type="number" className={field} value={p.preferences.areaMin ?? ""}
              onChange={(e) => setP({ ...p, preferences: { ...p.preferences, areaMin: num(e.target.value) } })} />
          </div>
          <div>
            <label className={label}>최대(㎡)</label>
            <input type="number" className={field} value={p.preferences.areaMax ?? ""}
              onChange={(e) => setP({ ...p, preferences: { ...p.preferences, areaMax: num(e.target.value) } })} />
          </div>
        </div>
        <label className={label}>관심 지역(쉼표로 구분)</label>
        <input className={field} value={regionsText} placeholder="안양시, 군포시, 광명시, 서울 서남권"
          onChange={(e) => setRegionsText(e.target.value)} data-testid="profile-regions" />
        <div className="mt-2 flex flex-wrap gap-2">
          {ALL_SOURCES.map((s) => (
            <label key={s} className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={p.preferences.sources.includes(s)} onChange={() => toggleSource(s)} />
              {SOURCE_LABEL[s]}
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        data-testid="profile-save"
      >
        {status === "saving" ? "저장 중…" : "저장하고 추천 갱신"}
      </button>
      {message && (
        <p className={`text-center text-xs ${status === "error" ? "text-red-600" : "text-green-700"}`} data-testid="profile-message">
          {message}
        </p>
      )}
      {saved && (
        <button
          type="button"
          onClick={() => {
            router.refresh(); // 캐시된 추천 페이지 무효화 → 변경된 관심지역 즉시 반영
            router.push("/");
          }}
          className="rounded-lg border border-blue-200 bg-blue-50 py-2 text-center text-sm font-medium text-blue-700"
          data-testid="profile-goto-feed"
        >
          추천 보러가기 →
        </button>
      )}
    </form>
  );
}
