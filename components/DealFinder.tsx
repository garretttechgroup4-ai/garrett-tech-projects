"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { money } from "@/lib/format";
import { PRESET_AREAS } from "@/lib/geo";
import type { ScoredItem } from "@/lib/scored";
import type { Boundary, DataSource, PreviewResult, Ring } from "@/lib/types";
import ScoreBadge from "./ScoreBadge";
import { btnPrimary, btnSecondary, CALL_COLOR, REVIEW_COLOR } from "./ui";

const DealMap = dynamic(() => import("./DealMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-slate-100 text-muted">Loading map…</div>,
});

type Step = "start" | "drawing" | "ready" | "results";
type Tab = "call" | "review";
type SortKey = "score" | "value" | "equity" | "years" | "built" | "width";

const SORTS: { key: SortKey; label: string; get: (i: ScoredItem) => number | null; asc?: boolean }[] = [
  { key: "score", label: "Score", get: (i) => i.score.score },
  { key: "value", label: "Value", get: (i) => i.property.estimatedValue },
  { key: "equity", label: "Equity %", get: (i) => i.property.equityPercent },
  { key: "years", label: "Years owned", get: (i) => i.yearsOwned },
  { key: "built", label: "Oldest first", get: (i) => i.property.yearBuilt, asc: true },
  { key: "width", label: "Lot width", get: (i) => i.lotWidth },
];

const defaultName = () => `Area · ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

export default function DealFinder({ source }: { source: DataSource }) {
  const [step, setStep] = useState<Step>("start");
  const [boundary, setBoundary] = useState<Ring | null>(null);
  const [areaName, setAreaName] = useState("");
  const [draft, setDraft] = useState<Ring>([]);
  const [items, setItems] = useState<ScoredItem[]>([]);
  const [saved, setSaved] = useState<Boundary[]>([]);
  const [lines, setLines] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Tab>("call");
  const [sort, setSort] = useState<SortKey>("score");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [busy, setBusy] = useState<null | "preview" | "run">(null);
  const [error, setError] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({});

  // Reopen where you left off, and load saved areas.
  useEffect(() => {
    fetch("/api/search/latest")
      .then((r) => r.json())
      .then((data) => {
        if (data?.search) {
          setBoundary(data.search.boundary);
          setAreaName(data.search.boundaryName);
          setItems(data.items);
          setTab(data.items.some((i: ScoredItem) => i.score.list === "call") ? "call" : "review");
          setStep("results");
        }
      })
      .catch(() => {});
    fetch("/api/boundaries").then((r) => r.json()).then(setSaved).catch(() => {});
  }, []);

  // One-line reasons: automatic right away, Claude's lines as they arrive (20 per request).
  useEffect(() => {
    if (!items.length) return;
    let alive = true;
    const ids = items.map((i) => i.property.radarId);
    (async () => {
      for (let round = 0; round < 20 && alive; round++) {
        const res = await fetch("/api/summaries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ radarIds: ids }),
        }).catch(() => null);
        if (!res?.ok || !alive) return;
        const data = await res.json();
        if (!alive) return;
        setLines(Object.fromEntries(Object.entries(data.summaries as Record<string, { text: string }>).map(([k, v]) => [k, v.text])));
        if (!data.pending) return;
      }
    })();
    return () => {
      alive = false;
    };
  }, [items]);

  const callCount = items.filter((i) => i.score.list === "call").length;
  const shown = useMemo(() => {
    const s = SORTS.find((x) => x.key === sort)!;
    return items
      .filter((i) => i.score.list === tab)
      .sort((a, b) => {
        const va = s.get(a);
        const vb = s.get(b);
        if (va == null) return 1;
        if (vb == null) return -1;
        return s.asc ? va - vb : vb - va;
      });
  }, [items, tab, sort]);

  const pins = useMemo(
    () =>
      items.map((i) => ({
        id: i.property.radarId,
        lat: i.property.lat,
        lng: i.property.lng,
        label: `${i.score.score} · ${i.property.address}`,
        color: i.score.list === "call" ? CALL_COLOR : REVIEW_COLOR,
      })),
    [items]
  );

  const onMapTap = useCallback(
    (lng: number, lat: number) => {
      if (step === "drawing") setDraft((d) => [...d, [lng, lat]]);
    },
    [step]
  );

  const onSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      const item = items.find((i) => i.property.radarId === id);
      if (item) setTab(item.score.list);
      setTimeout(() => rowRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    },
    [items]
  );

  function startDrawing() {
    setError(null);
    setDraft([]);
    setItems([]);
    setSelectedId(null);
    setStep("drawing");
  }

  function finishDrawing() {
    if (draft.length < 3) return;
    setBoundary(draft);
    setAreaName(defaultName());
    setDraft([]);
    setStep("ready");
  }

  function cancelDrawing() {
    setDraft([]);
    setStep(boundary ? "ready" : "start");
  }

  function pickArea(name: string, ring: Ring) {
    setError(null);
    setDraft([]);
    setItems([]);
    setSelectedId(null);
    setBoundary(ring);
    setAreaName(name);
    setStep("ready");
  }

  function newSearch() {
    setError(null);
    setDraft([]);
    setBoundary(null);
    setItems([]);
    setLines({});
    setSelectedId(null);
    setStep("start");
    fetch("/api/boundaries").then((r) => r.json()).then(setSaved).catch(() => {});
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
        body: JSON.stringify({ boundary, name: areaName, confirmed: true, previewCount: preview.count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(data.items);
      setLines({});
      setTab(data.items.some((i: ScoredItem) => i.score.list === "call") ? "call" : "review");
      setPreview(null);
      setStep("results");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const quickAreas = [
    ...saved.slice(0, 4).map((b) => ({ key: b.id, name: b.name, ring: b.ring })),
    ...PRESET_AREAS.filter((p) => !saved.some((b) => b.name === p.name)).map((p) => ({ key: p.name, name: p.name, ring: p.ring })),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <div className="relative h-[48dvh] shrink-0 md:h-auto md:flex-1">
        <DealMap
          boundary={boundary}
          draft={draft}
          drawing={step === "drawing"}
          pins={pins}
          selectedId={selectedId}
          onMapTap={onMapTap}
          onSelect={onSelect}
        />
      </div>

      <aside className="flex min-h-0 flex-1 flex-col border-t border-border bg-white md:w-[440px] md:flex-none md:border-l md:border-t-0">
        {error && (
          <div role="alert" className="m-4 mb-0 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        {step === "start" && (
          <div className="p-5">
            <StepLabel n={1} text="Choose an area" />
            <h2 className="mb-1 text-xl font-bold">Where do you want to look?</h2>
            <p className="mb-5 text-muted">Outline streets on the map, or pick an area you&apos;ve used before.</p>
            <button className={`${btnPrimary} w-full`} onClick={startDrawing}>
              Draw an area
            </button>
            {quickAreas.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold text-muted">Or pick an area</p>
                <div className="flex flex-wrap gap-2">
                  {quickAreas.map((a) => (
                    <button key={a.key} className={btnSecondary} onClick={() => pickArea(a.name, a.ring)}>
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
            <label htmlFor="area-name" className="mb-1 block text-sm font-semibold text-muted">
              Name this area
            </label>
            <input
              id="area-name"
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              className="mb-4 min-h-[48px] w-full rounded-xl border border-border px-4 text-base focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
              maxLength={80}
            />
            <p className="mb-5 text-muted">We&apos;ll count what&apos;s inside and show the cost before anything is bought.</p>
            <button className={`${btnPrimary} w-full`} onClick={findProperties} disabled={busy !== null || !areaName.trim()}>
              {busy === "preview" ? "Counting…" : "Find properties"}
            </button>
            <button className={`${btnSecondary} mt-3 w-full`} onClick={startDrawing}>
              Redraw area
            </button>
          </div>
        )}

        {step === "results" && (
          <>
            <div className="border-b border-border p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold">{areaName || "Results"}</h2>
                  <p className="text-sm text-muted">
                    {items.length} {items.length === 1 ? "property" : "properties"}
                  </p>
                </div>
                <button className={`${btnSecondary} min-h-[44px] shrink-0 whitespace-nowrap px-4 text-sm`} onClick={newSearch}>
                  New search
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
                <TabButton active={tab === "call"} onClick={() => setTab("call")} label={`Call List (${callCount})`} />
                <TabButton active={tab === "review"} onClick={() => setTab("review")} label={`Review List (${items.length - callCount})`} />
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <label htmlFor="sort" className="text-muted">
                  Sort by
                </label>
                <select
                  id="sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="min-h-[40px] rounded-lg border border-border bg-white px-2 font-semibold"
                >
                  {SORTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {shown.length === 0 ? (
              <p className="p-5 text-muted">
                {tab === "call"
                  ? "Nothing scored 6 or higher here yet. Check the Review List — mark any property “Eyes on” to move it up."
                  : "Nothing on the Review List."}
              </p>
            ) : (
              <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
                {shown.map((i) => (
                  <Row
                    key={i.property.radarId}
                    item={i}
                    line={lines[i.property.radarId] ?? i.score.reason}
                    selected={i.property.radarId === selectedId}
                    refCb={(node) => {
                      rowRefs.current[i.property.radarId] = node;
                    }}
                    onHover={() => setSelectedId(i.property.radarId)}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </aside>

      {preview && (
        <ConfirmSheet preview={preview} source={source} busy={busy === "run"} onCancel={() => setPreview(null)} onConfirm={confirmSearch} />
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

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`min-h-[44px] rounded-lg px-3 text-sm font-semibold ${active ? "bg-white text-ink shadow-sm" : "text-muted"}`}
    >
      {label}
    </button>
  );
}

function Row({
  item,
  line,
  selected,
  refCb,
  onHover,
}: {
  item: ScoredItem;
  line: string;
  selected: boolean;
  refCb: (n: HTMLLIElement | null) => void;
  onHover: () => void;
}) {
  const p = item.property;
  const facts = [
    p.estimatedValue != null ? money(p.estimatedValue) : null,
    p.equityPercent != null ? `${p.equityPercent}% equity` : null,
    item.yearsOwned != null ? `${item.yearsOwned} yrs owned` : null,
    p.yearBuilt ? `built ${p.yearBuilt}` : null,
    item.lotWidth != null ? `~${item.lotWidth} ft lot` : null,
  ].filter(Boolean);
  // The tile already shows the score, so drop the leading "8 — ".
  const reason = line.replace(/^\s*\d+\s*[—-]\s*/, "");
  return (
    <li ref={refCb} onMouseEnter={onHover} className={selected ? "bg-blue-light" : ""}>
      <Link href={`/property/${encodeURIComponent(p.radarId)}`} className="flex gap-3 px-4 py-4 hover:bg-slate-50 active:bg-slate-100">
        <ScoreBadge score={item.score.score} list={item.score.list} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{p.address}</div>
          <div className="text-sm text-ink">{reason}</div>
          <div className="mt-1 text-xs text-muted">{facts.join(" · ")}</div>
          {(item.score.eyesOn || item.score.overridden || item.fits.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.score.eyesOn && <Chip>Eyes on</Chip>}
              {item.score.overridden && <Chip>Score changed by team</Chip>}
              {item.fits.length > 0 && <Chip>Fits: {item.fits.join(", ")}</Chip>}
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-blue-light px-2.5 py-0.5 text-xs font-semibold text-blue-dark ring-1 ring-inset ring-blue/20">{children}</span>;
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
  const newRecords = Math.max(0, Math.min(preview.count, preview.cap) - preview.alreadyHave);
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-slate-900/30 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-blue">Step 3 of 3 · Confirm</p>
        <h2 className="text-2xl font-bold">
          {none ? "No matching properties" : `${preview.count.toLocaleString()} ${preview.count === 1 ? "property" : "properties"} match`}
        </h2>
        <p className="mt-1 text-sm text-muted">Worth $700K+ · houses, 2–4 flats and land.</p>

        {!none && (
          <dl className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-4">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Already saved (free)</dt>
              <dd className="font-semibold">{preview.alreadyHave}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">New to buy</dt>
              <dd className="font-semibold">{newRecords}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-2">
              <dt className="font-semibold">PropertyRadar credits</dt>
              <dd className="text-lg font-bold">{source === "demo" ? "0" : preview.credits.toLocaleString()}</dd>
            </div>
          </dl>
        )}

        <div className="mt-3 space-y-2 text-sm text-muted">
          {none && <p>Try a bigger area.</p>}
          {!none && source === "demo" && <p>Demo mode — sample data, nothing is bought. Live, this would use {newRecords} credits.</p>}
          {preview.overCap && (
            <p className="rounded-xl bg-amber-50 p-3 font-medium text-amber-800 ring-1 ring-amber-200">
              That&apos;s more than the {preview.cap} limit per pull, so only {preview.cap} will load. Draw a smaller area to see them all.
            </p>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button className={btnSecondary} onClick={onCancel} disabled={busy}>
            {none ? "Close" : "Cancel"}
          </button>
          {!none && (
            <button className={btnPrimary} onClick={onConfirm} disabled={busy}>
              {busy ? "Loading…" : source === "demo" || preview.credits === 0 ? "Show them" : `Use ${preview.credits} credits`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
