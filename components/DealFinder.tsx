"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { orderedSignals } from "@/lib/config";
import { bedsBaths, money } from "@/lib/format";
import { PRESET_AREAS } from "@/lib/geo";
import type { DataSource, PreviewResult, Property, Ring } from "@/lib/types";
import { byScore } from "@/lib/scoring";
import ScoreBadge from "./ScoreBadge";
import SignalTag from "./SignalTag";

const DealMap = dynamic(() => import("./DealMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-slate-100 text-muted">Loading map…</div>,
});

type Step = "start" | "drawing" | "ready" | "results";

const btnPrimary =
  "inline-flex min-h-[48px] items-center justify-center rounded-xl bg-blue px-5 text-base font-semibold text-white shadow-sm hover:bg-blue-dark disabled:opacity-40";
const btnSecondary =
  "inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white px-5 text-base font-semibold text-ink ring-1 ring-border hover:bg-slate-50 disabled:opacity-40";

export default function DealFinder({ source }: { source: DataSource }) {
  const [step, setStep] = useState<Step>("start");
  const [boundary, setBoundary] = useState<Ring | null>(null);
  const [draft, setDraft] = useState<Ring>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [busy, setBusy] = useState<null | "preview" | "run">(null);
  const [error, setError] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({});
  // Always rank by the current scoring config, even for restored searches.
  const sorted = useMemo(() => [...properties].sort(byScore), [properties]);

  // Reopen where you left off: the last search comes back automatically.
  useEffect(() => {
    fetch("/api/search/latest")
      .then((r) => r.json())
      .then((data) => {
        if (data?.search) {
          setBoundary(data.search.boundary);
          setProperties(data.properties);
          setStep("results");
        }
      })
      .catch(() => {});
  }, []);

  const onMapTap = useCallback(
    (lng: number, lat: number) => {
      if (step === "drawing") setDraft((d) => [...d, [lng, lat]]);
    },
    [step]
  );

  const onSelect = useCallback((id: string) => {
    setSelectedId(id);
    rowRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  function startDrawing() {
    setError(null);
    setDraft([]);
    setProperties([]);
    setSelectedId(null);
    setStep("drawing");
  }

  function finishDrawing() {
    if (draft.length < 3) return;
    setBoundary(draft);
    setDraft([]);
    setStep("ready");
  }

  function cancelDrawing() {
    setDraft([]);
    setStep(boundary ? "ready" : "start");
  }

  function newSearch() {
    setError(null);
    setDraft([]);
    setBoundary(null);
    setProperties([]);
    setSelectedId(null);
    setStep("start");
  }

  function pickPreset(ring: Ring) {
    setError(null);
    setDraft([]);
    setProperties([]);
    setSelectedId(null);
    setBoundary(ring);
    setStep("ready");
  }

  async function findProperties() {
    if (!boundary) return;
    setBusy("preview");
    setError(null);
    try {
      const res = await fetch("/api/search/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boundary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreview(data);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function confirmSearch() {
    if (!boundary || !preview) return;
    setBusy("run");
    setError(null);
    try {
      const res = await fetch("/api/search/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boundary, confirmed: true, previewCount: preview.count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProperties(data.properties);
      setPreview(null);
      setStep("results");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      {/* Map */}
      <div className="relative h-[52dvh] shrink-0 md:h-auto md:flex-1">
        <DealMap
          boundary={boundary}
          draft={draft}
          drawing={step === "drawing"}
          properties={properties}
          selectedId={selectedId}
          onMapTap={onMapTap}
          onSelect={onSelect}
        />
      </div>

      {/* Panel */}
      <aside className="flex min-h-0 flex-1 flex-col border-t border-border bg-white md:w-[420px] md:flex-none md:border-l md:border-t-0">
        {error && (
          <div role="alert" className="m-4 mb-0 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        {step === "start" && (
          <div className="p-5">
            <StepLabel n={1} text="Choose an area" />
            <h2 className="mb-1 text-xl font-bold">Where do you want to look?</h2>
            <p className="mb-5 text-muted">Outline any area on the map, or pick a neighborhood.</p>
            <button className={`${btnPrimary} w-full`} onClick={startDrawing}>
              Draw an area
            </button>
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-muted">Or pick a neighborhood</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_AREAS.map((a) => (
                  <button key={a.name} className={btnSecondary} onClick={() => pickPreset(a.ring)}>
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {step === "drawing" && (
          <div className="p-5">
            <StepLabel n={1} text="Draw your area" />
            <h2 className="mb-1 text-xl font-bold" aria-live="polite">
              {draft.length === 0
                ? "Tap the map to start"
                : draft.length < 3
                  ? `${draft.length} point${draft.length > 1 ? "s" : ""} — keep going`
                  : `${draft.length} points — looks good?`}
            </h2>
            <p className="mb-5 text-muted">
              {draft.length < 3
                ? "Tap around the edge of the area you want, one corner at a time. You need at least 3."
                : "Keep tapping to add more corners, or tap Done."}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button className={btnSecondary} onClick={() => setDraft((d) => d.slice(0, -1))} disabled={!draft.length}>
                Undo
              </button>
              <button className={btnSecondary} onClick={cancelDrawing}>
                Cancel
              </button>
              <button className={btnPrimary} onClick={finishDrawing} disabled={draft.length < 3}>
                Done
              </button>
            </div>
          </div>
        )}

        {step === "ready" && (
          <div className="p-5">
            <StepLabel n={2} text="Find properties" />
            <h2 className="mb-1 text-xl font-bold">Your area is set</h2>
            <p className="mb-5 text-muted">We&apos;ll check how many properties are inside before loading anything.</p>
            <button className={`${btnPrimary} w-full`} onClick={findProperties} disabled={busy !== null}>
              {busy === "preview" ? "Checking…" : "Find properties"}
            </button>
            <button className={`${btnSecondary} mt-3 w-full`} onClick={startDrawing}>
              Redraw area
            </button>
          </div>
        )}

        {step === "results" && (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-border p-4">
              <div>
                <h2 className="text-lg font-bold">
                  {properties.length} {properties.length === 1 ? "property" : "properties"}
                </h2>
                <p className="text-sm text-muted">Best deals first · tap one for details</p>
              </div>
              <button className={`${btnSecondary} min-h-[44px] shrink-0 whitespace-nowrap px-4 text-sm`} onClick={newSearch}>
                New search
              </button>
            </div>
            {properties.length === 0 ? (
              <p className="p-5 text-muted">No properties in this area. Try drawing a bigger one.</p>
            ) : (
              <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
                {sorted.map((p) => (
                  <PropertyRow
                    key={p.id}
                    p={p}
                    selected={p.id === selectedId}
                    refCb={(node) => {
                      rowRefs.current[p.id] = node;
                    }}
                    onHover={() => setSelectedId(p.id)}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </aside>

      {preview && (
        <ConfirmSheet
          preview={preview}
          source={source}
          busy={busy === "run"}
          onCancel={() => setPreview(null)}
          onConfirm={confirmSearch}
        />
      )}
    </div>
  );
}

function StepLabel({ n, text }: { n: number; text: string }) {
  return (
    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-blue">
      Step {n} of 3 · {text}
    </p>
  );
}

function PropertyRow({
  p,
  selected,
  refCb,
  onHover,
}: {
  p: Property;
  selected: boolean;
  refCb: (n: HTMLLIElement | null) => void;
  onHover: () => void;
}) {
  const signals = orderedSignals(p.signals);
  return (
    <li ref={refCb} onMouseEnter={onHover} className={selected ? "bg-blue-light" : ""}>
      <Link href={`/property/${p.id}`} className="flex gap-3 px-4 py-4 hover:bg-slate-50 active:bg-slate-100">
        <ScoreBadge signals={p.signals} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-semibold">{p.address}</div>
              <div className="text-sm text-muted">
                {[p.neighborhood, p.propertyType, bedsBaths(p.beds, p.baths)].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-semibold">{money(p.estimatedValue)}</div>
              <div className="text-xs text-muted">est. value</div>
            </div>
          </div>
          {signals.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {signals.slice(0, 2).map((s) => (
                <SignalTag key={s.id} signal={s} />
              ))}
              {signals.length > 2 && <span className="self-center text-xs font-semibold text-muted">+{signals.length - 2} more</span>}
            </div>
          ) : (
            <div className="mt-2 text-xs text-muted">No seller signals</div>
          )}
        </div>
      </Link>
    </li>
  );
}

function ConfirmSheet({
  preview,
  source,
  busy,
  onCancel,
  onConfirm,
}: {
  preview: PreviewResult;
  source: DataSource;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const none = preview.count === 0;
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-slate-900/30 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-blue">Step 3 of 3 · Confirm</p>
        <h2 className="text-2xl font-bold">
          {none
            ? "No properties found"
            : `${preview.approximate ? "About " : ""}${preview.count.toLocaleString()} ${preview.count === 1 ? "property" : "properties"} in this area`}
        </h2>
        <div className="mt-3 space-y-2 text-muted">
          {none ? (
            <p>Try drawing a bigger area.</p>
          ) : source === "demo" ? (
            <p>You&apos;re in demo mode — these are sample properties and nothing is purchased.</p>
          ) : (
            <p>
              This will use up to <strong className="text-ink">{preview.recordsToUse.toLocaleString()}</strong> PropertyRadar records.
            </p>
          )}
          {preview.overCap && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
              That&apos;s more than the {preview.cap} limit per search, so only the first {preview.cap} will load. Draw a smaller area to see them all.
            </p>
          )}
          {preview.approximate && !none && (
            <p className="text-sm">The count covers the box around your outline; only properties inside your outline are shown.</p>
          )}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button className={btnSecondary} onClick={onCancel} disabled={busy}>
            {none ? "Close" : "Cancel"}
          </button>
          {!none && (
            <button className={btnPrimary} onClick={onConfirm} disabled={busy}>
              {busy ? "Loading…" : "Show them"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
