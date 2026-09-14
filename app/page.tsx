"use client";

import { useState } from "react";

const PHASES = [
  { name: "Phase 0 — Foundation", status: "Done", detail: "Project scaffold, criteria profile model, API client." },
  { name: "Phase 1 — API Exploration", status: "Pending key", detail: "Needs PROPERTYRADAR_API set in the environment." },
  { name: "Phase 2 — Filter Engine", status: "Not started", detail: "Pull properties by plate against the Criteria Profile." },
  { name: "Phase 3 — Scoring + Rationale", status: "Not started", detail: "Score every match 0-100 with a written rationale." },
  { name: "Phase 4 — Review Gate + Outreach Drafts", status: "Not started", detail: "Human approval required before anything drafts or sends." },
  { name: "Phase 5 — Cityscape Integration", status: "Not started", detail: "Owner lookup, permits, development pressure layer." },
  { name: "Phase 6 — Dashboard on Vercel", status: "In progress", detail: "This dashboard." },
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  async function runExploration() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/propertyradar/explore?limit=5");
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">Build Status</h2>
        <ul className="flex flex-col gap-3">
          {PHASES.map((phase) => (
            <li key={phase.name} className="flex items-start justify-between gap-4 rounded-lg border border-border bg-blue-light/40 p-4">
              <div>
                <div className="font-semibold">{phase.name}</div>
                <div className="text-sm text-muted">{phase.detail}</div>
              </div>
              <span className="whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-dark ring-1 ring-border">
                {phase.status}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-bold">Phase 1 — API Exploration</h2>
        <p className="mb-4 text-sm text-muted">
          Pulls PropertyRadar&apos;s available lists and a small property sample so every field it returns is
          visible before any filtering or scoring logic gets built on top of it. Requires{" "}
          <code className="rounded bg-blue-light px-1.5 py-0.5">PROPERTYRADAR_API</code> to be set in the environment.
        </p>
        <button
          onClick={runExploration}
          disabled={loading}
          className="rounded-lg bg-blue px-5 py-2.5 font-semibold text-white hover:bg-blue-dark disabled:opacity-50"
        >
          {loading ? "Running..." : "Run API Exploration"}
        </button>
        {result !== null && (
          <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-ink/95 p-4 text-xs text-white">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </section>
    </div>
  );
}
