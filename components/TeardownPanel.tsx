"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TeardownAI } from "@/lib/store";
import { btnPrimary, btnSecondary } from "./ui";

const VERDICT: Record<TeardownAI["verdict"], string> = {
  likely_teardown: "Likely teardown",
  renovate: "Worth renovating",
  newer_build: "Newer build",
  cant_tell: "Can't tell from the photo",
};

/** Claude suggests; a person decides. Only a person's confirmation counts toward the score. */
export default function TeardownPanel({
  radarId,
  canAsk,
  ai,
  decision,
}: {
  radarId: string;
  canAsk: boolean;
  ai: TeardownAI | null;
  decision: { confirmed: boolean; reason: string; when: string } | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "ask" | "save">(null);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    setBusy("ask");
    setError(null);
    const res = await fetch("/api/teardown", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ radarId }) });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setError(data.error ?? "Couldn't check the photo.");
    router.refresh();
  }

  async function decide(confirmed: boolean) {
    setBusy("save");
    setError(null);
    const reason = ai ? `${confirmed ? "Agreed" : "Disagreed"} with Claude: ${VERDICT[ai.verdict]}` : "";
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ radarId, action: confirmed ? "teardown_confirmed" : "teardown_rejected", reason }),
    });
    setBusy(null);
    if (!res.ok) return setError("Couldn't save. Please try again.");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {decision && (
        <p className={`rounded-xl p-3 text-sm font-medium ring-1 ${decision.confirmed ? "bg-blue-light text-blue-dark ring-blue/20" : "bg-slate-50 text-ink ring-border"}`}>
          {decision.confirmed ? "Teardown confirmed" : "Marked not a teardown"} — {decision.reason}
          <span className="text-muted"> · {decision.when}</span>
        </p>
      )}
      {ai && (
        <div className="rounded-xl bg-slate-50 p-3 text-sm ring-1 ring-border">
          <p className="font-semibold">Claude: {VERDICT[ai.verdict]}</p>
          <p className="text-muted">{ai.why}</p>
        </div>
      )}
      {!ai && (
        <button className={`${btnSecondary} w-full`} onClick={ask} disabled={!canAsk || busy !== null}>
          {busy === "ask" ? "Looking at the photo…" : "Ask Claude to check the photo"}
        </button>
      )}
      {!canAsk && !ai && <p className="text-xs text-muted">Needs the Google Maps and Anthropic keys. You can still decide yourself:</p>}
      <div className="grid grid-cols-2 gap-2">
        <button className={btnPrimary} onClick={() => decide(true)} disabled={busy !== null}>
          It&apos;s a teardown
        </button>
        <button className={btnSecondary} onClick={() => decide(false)} disabled={busy !== null}>
          Not a teardown
        </button>
      </div>
      {error && <p className="text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}
