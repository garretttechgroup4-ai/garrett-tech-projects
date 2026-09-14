"use client";

import { useEffect, useState } from "react";
import { PROPERTYRADAR_PLATES, type CriteriaProfile } from "@/lib/types";

const EMPTY: CriteriaProfile = {
  clientName: "",
  zones: [],
  propertyTypes: [],
  priceMin: 0,
  priceMax: 0,
  minEquityPercent: 0,
  plates: [],
  notes: "",
  updatedAt: "",
};

export default function CriteriaPage() {
  const [profile, setProfile] = useState<CriteriaProfile>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/criteria")
      .then((res) => res.json())
      .then(setProfile);
  }, []);

  function togglePlate(plate: string) {
    setProfile((p) => ({
      ...p,
      plates: p.plates.includes(plate) ? p.plates.filter((x) => x !== plate) : [...p.plates, plate],
    }));
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/criteria", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const updated = await res.json();
    setProfile(updated);
    setSavedAt(updated.updatedAt);
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-bold">Criteria Profile</h2>
        <p className="mb-6 text-sm text-muted">
          The rules the scoring engine filters against. Edit this once Prashanth&apos;s actual zones, property
          types, price range, and equity requirements are in hand.
        </p>

        <div className="grid gap-5">
          <div>
            <label className="mb-1 block text-sm font-semibold">Client Name</label>
            <input
              className="w-full rounded-lg border border-border px-3 py-2"
              value={profile.clientName}
              onChange={(e) => setProfile({ ...profile, clientName: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Zones <span className="text-muted">(comma-separated ZIPs or neighborhoods)</span></label>
            <input
              className="w-full rounded-lg border border-border px-3 py-2"
              value={profile.zones.join(", ")}
              onChange={(e) => setProfile({ ...profile, zones: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Property Types <span className="text-muted">(comma-separated)</span></label>
            <input
              className="w-full rounded-lg border border-border px-3 py-2"
              placeholder="Single Family, Multi-Family 2-4, Condo"
              value={profile.propertyTypes.join(", ")}
              onChange={(e) => setProfile({ ...profile, propertyTypes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold">Price Min</label>
              <input
                type="number"
                className="w-full rounded-lg border border-border px-3 py-2"
                value={profile.priceMin}
                onChange={(e) => setProfile({ ...profile, priceMin: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Price Max</label>
              <input
                type="number"
                className="w-full rounded-lg border border-border px-3 py-2"
                value={profile.priceMax}
                onChange={(e) => setProfile({ ...profile, priceMax: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Minimum Equity <span className="text-muted">(%)</span></label>
            <input
              type="number"
              className="w-full rounded-lg border border-border px-3 py-2"
              value={profile.minEquityPercent}
              onChange={(e) => setProfile({ ...profile, minEquityPercent: Number(e.target.value) })}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">PropertyRadar Plates</label>
            <div className="flex flex-wrap gap-2">
              {PROPERTYRADAR_PLATES.map((plate) => (
                <button
                  key={plate}
                  type="button"
                  onClick={() => togglePlate(plate)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-border ${
                    profile.plates.includes(plate) ? "bg-blue text-white ring-blue" : "bg-white text-ink"
                  }`}
                >
                  {plate}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Notes</label>
            <textarea
              className="w-full rounded-lg border border-border px-3 py-2"
              rows={3}
              value={profile.notes}
              onChange={(e) => setProfile({ ...profile, notes: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-blue px-5 py-2.5 font-semibold text-white hover:bg-blue-dark disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
            {savedAt && <span className="text-sm text-good">Saved {new Date(savedAt).toLocaleString()}</span>}
          </div>
        </div>
      </section>
    </div>
  );
}
