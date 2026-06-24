"use client";
// PWA 설치 유도 (C23, US-5.3). beforeinstallprompt 가로채기.
import { useEffect, useState } from "react";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!evt) return null;
  return (
    <button
      onClick={async () => {
        await evt.prompt();
        setEvt(null);
      }}
      className="rounded bg-gray-800 px-2 py-1 text-xs font-medium text-white"
      data-testid="install-prompt"
    >
      앱 설치
    </button>
  );
}
