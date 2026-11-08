"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BuyBox } from "@/lib/types";
import { btnPrimary, btnSecondary, card } from "./ui";

export interface SignalRow {
  id: string;
  label: string;
  tier: string;
  points: number;
  enabled: boolean;
  locked: boolean;
}

const emptyBox = (): BuyBox => ({ id: "", developer: "", min_lot_width_ft: null, property_types: ["SFR", "MFR", "LND"], max_land_price_usd: null, areas: [], avoid: [] });
const TYPES: [string, string][] = [["SFR", "House"], ["MFR", "2–4 flat"], ["LND", "Land"]];
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export default function SettingsForm({ signals, buyBoxes }: { signals: SignalRow[]; buyBoxes: BuyBox[] }) {
  const router = useRouter();
  const [toggles, setToggles] = useState<Record<string, boolean>>(Object.fromEntries(signals.map((s) => [s.id, s.enabled])));
  const [boxes, setBoxes] = useState<BuyBox[]>(buyBoxes);
  const [editing, setEditing] = useState<BuyBox | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function save(nextToggles = toggles, nextBoxes = boxes) {
    setStatus("Saving…");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signalToggles: nextToggles, buyBoxes: nextBoxes }),
    });
    if (!res.ok) return setStatus("Couldn't save. Please try again.");
    const data = await res.json();
    setBoxes(data.buyBoxes);
    setStatus("Saved");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <section className={card}>
        <h2 className="mb-1 text-lg font-bold">Signals</h2>
        <p className="mb-4 text-sm text-muted">Turn a signal off to stop it counting toward scores. Points come from config.</p>
        <ul className="divide-y divide-border">
          {signals.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="font-semibold">{s.label}</div>
                <div className="text-xs text-muted">
                  {s.tier} · +{s.points}
                  {s.locked && " · locked until attorney review"}
                </div>
              </div>
              <button
                role="switch"
                aria-checked={toggles[s.id]}
                aria-label={s.label}
                disabled={s.locked}
                onClick={() => {
                  const next = { ...toggles, [s.id]: !toggles[s.id] };
                  setToggles(next);
                  save(next);
                }}
                className={`relative h-8 w-14 shrink-0 rounded-full transition ${toggles[s.id] ? "bg-blue" : "bg-slate-300"} disabled:opacity-40`}
              >
                <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${toggles[s.id] ? "left-7" : "left-1"}`} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={card}>
        <h2 className="mb-1 text-lg font-bold">Buy boxes</h2>
        <p className="mb-4 text-sm text-muted">One per developer. Matching properties show “Fits: …”. Lot width is estimated (lot size ÷ 125).</p>
        {boxes.length === 0 && !editing && <p className="mb-4 text-muted">No buy boxes yet.</p>}
        <ul className="mb-4 space-y-2">
          {boxes.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-border">
              <div className="min-w-0 text-sm">
                <div className="font-semibold">{b.developer}</div>
                <div className="text-muted">
                  {[
                    b.min_lot_width_ft ? `${b.min_lot_width_ft}+ ft lot` : null,
                    b.property_types.length ? b.property_types.join("/") : null,
                    b.max_land_price_usd ? `up to $${b.max_land_price_usd.toLocaleString()}` : null,
                    b.areas.length ? b.areas.join(", ") : null,
                    b.avoid.length ? `avoid: ${b.avoid.join(", ")}` : null,
                  ].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button className="min-h-[44px] px-3 font-semibold text-blue" onClick={() => setEditing(b)}>Edit</button>
                <button
                  className="min-h-[44px] px-3 font-semibold text-red-700"
                  onClick={() => {
                    const next = boxes.filter((x) => x.id !== b.id);
                    setBoxes(next);
                    save(toggles, next);
                  }}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
        {editing ? (
          <BoxEditor
            box={editing}
            onCancel={() => setEditing(null)}
            onSave={(b) => {
              const next = b.id ? boxes.map((x) => (x.id === b.id ? b : x)) : [...boxes, b];
              setEditing(null);
              save(toggles, next);
            }}
          />
        ) : (
          <button className={`${btnSecondary} w-full`} onClick={() => setEditing(emptyBox())}>
            Add a developer
          </button>
        )}
      </section>
      {status && <p className="text-center text-sm text-muted" aria-live="polite">{status}</p>}
    </div>
  );
}

function BoxEditor({ box, onSave, onCancel }: { box: BuyBox; onSave: (b: BuyBox) => void; onCancel: () => void }) {
  const [b, setB] = useState(box);
  const [areas, setAreas] = useState(box.areas.join(", "));
  const [avoid, setAvoid] = useState(box.avoid.join(", "));
  const input = "min-h-[48px] w-full rounded-xl border border-border px-4 text-base focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20";
  return (
    <div className="space-y-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-border">
      <Field label="Developer name">
        <input className={input} value={b.developer} onChange={(e) => setB({ ...b, developer: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Min lot width (ft)">
          <input className={input} inputMode="numeric" value={b.min_lot_width_ft ?? ""} onChange={(e) => setB({ ...b, min_lot_width_ft: e.target.value ? Number(e.target.value) : null })} />
        </Field>
        <Field label="Max land price ($)">
          <input className={input} inputMode="numeric" value={b.max_land_price_usd ?? ""} onChange={(e) => setB({ ...b, max_land_price_usd: e.target.value ? Number(e.target.value.replace(/[^0-9]/g, "")) : null })} />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-semibold">Property types</legend>
        <div className="flex flex-wrap gap-2">
          {TYPES.map(([code, label]) => {
            const on = b.property_types.includes(code);
            return (
              <button
                key={code}
                type="button"
                aria-pressed={on}
                onClick={() => setB({ ...b, property_types: on ? b.property_types.filter((t) => t !== code) : [...b.property_types, code] })}
                className={`min-h-[44px] rounded-xl px-4 font-semibold ring-1 ${on ? "bg-blue text-white ring-blue" : "bg-white ring-border"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>
      <Field label="Areas (comma-separated)">
        <input className={input} value={areas} onChange={(e) => setAreas(e.target.value)} placeholder="Bucktown, Wicker Park" />
      </Field>
      <Field label="Avoid (shown as notes)">
        <input className={input} value={avoid} onChange={(e) => setAvoid(e.target.value)} placeholder="corner lots, landmark district" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <button className={btnSecondary} onClick={onCancel}>Cancel</button>
        <button className={btnPrimary} disabled={!b.developer.trim()} onClick={() => onSave({ ...b, areas: list(areas), avoid: list(avoid) })}>
          Save
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}
