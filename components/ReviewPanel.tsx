"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Review } from "@/lib/types";
import { btnPrimary, btnSecondary } from "./ui";

const ACTION_LABEL: Record<Review["action"], string> = {
  agree: "Agreed with the score",
  override: "Changed the score",
  eyes_on: "Eyes on — moved to Call List",
  teardown_confirmed: "Confirmed teardown",
  teardown_rejected: "Not a teardown",
};

/** Agree / Override (reason required) / Eyes-on, plus the history. */
export default function ReviewPanel({
  radarId,
  list,
  score,
  eyesOn,
  history,
}: {
  radarId: string;
  list: "call" | "review";
  score: number;
  eyesOn: boolean;
  history: Review[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "override">(null);
  const [newScore, setNewScore] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ radarId, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Couldn't save. Please try again.");
    setMode(null);
    setReason("");
    setNewScore(null);
    router.refresh();
  }

  const visible = history.filter((h) => h.action !== "teardown_confirmed" && h.action !== "teardown_rejected");

  return (
    <div>
      {mode === null ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {list === "review" && (
            <button className={btnSecondary} disabled={busy} onClick={() => send({ action: "agree" })}>
              Agree — it&apos;s a {score}
            </button>
          )}
          <button className={btnSecondary} disabled={busy} onClick={() => setMode("override")}>
            Change score
          </button>
          {!eyesOn && (
            <button className={btnSecondary} disabled={busy} onClick={() => send({ action: "eyes_on" })}>
              Eyes on — I saw it
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold">New score</p>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setNewScore(n)}
                className={`min-h-[44px] rounded-xl text-base font-bold ring-1 ${newScore === n ? "bg-blue text-white ring-blue" : "bg-white ring-border"}`}
                aria-pressed={newScore === n}
              >
                {n}
              </button>
            ))}
          </div>
          <label htmlFor="reason" className="block text-sm font-semibold">
            Why? <span className="font-normal text-muted">(required — it helps tune the scoring)</span>
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-border p-3 text-base focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
            placeholder="e.g. Owner already listed with an agent"
          />
          <div className="grid grid-cols-2 gap-2">
            <button className={btnSecondary} onClick={() => setMode(null)} disabled={busy}>
              Cancel
            </button>
            <button
              className={btnPrimary}
              disabled={busy || newScore === null || !reason.trim()}
              onClick={() => send({ action: "override", newScore, reason })}
            >
              Save
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm font-medium text-red-700">{error}</p>}
      {visible.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
          {visible
            .slice()
            .reverse()
            .map((h) => (
              <li key={h.id}>
                <span className="font-semibold">{ACTION_LABEL[h.action]}</span>
                {h.newScore != null && ` to ${h.newScore}`} — {h.reason}
                <span className="text-muted">
                  {" "}
                  · {h.reviewer}, {new Date(h.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
