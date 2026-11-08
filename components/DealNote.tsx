"use client";

import { useEffect, useState } from "react";
import type { Rationale } from "@/lib/rationale";

/** Loads the deal write-up after the page renders, so the page itself is instant. */
export default function DealNote({ id }: { id: string }) {
  const [note, setNote] = useState<Rationale | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/rationale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Rationale) => alive && setNote(data))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [id]);

  if (failed) return <p className="text-muted">Couldn&apos;t load the write-up. Refresh to try again.</p>;
  if (!note) {
    return (
      <div className="space-y-2" aria-label="Writing deal note">
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-11/12 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
      </div>
    );
  }
  return (
    <div>
      <p className="text-[17px] leading-relaxed text-ink">{note.text}</p>
      <p className="mt-2 text-xs text-muted">
        {note.kind === "ai" ? "Written by Claude from the facts on this page. Double-check before acting." : note.note ?? "Automatic summary."}
      </p>
    </div>
  );
}
