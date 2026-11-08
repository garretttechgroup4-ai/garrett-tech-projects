import SettingsForm, { type SignalRow } from "@/components/SettingsForm";
import { card } from "@/components/ui";
import { date } from "@/lib/format";
import { effectiveConfig, scoreAll } from "@/lib/scored";
import { allReviews, creditLog, getProperty, getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [cfg, settings, reviews, credits] = await Promise.all([effectiveConfig(), getSettings(), allReviews(), creditLog()]);

  const signals: SignalRow[] = cfg.signals.map((s) => ({
    id: s.id,
    label: s.label,
    tier: s.tier,
    points: cfg.points[s.tier],
    enabled: s.enabled !== false,
    locked: Boolean(s.requires_legal_review),
  }));

  // Which signals get overridden most (so weights can be tuned).
  const overrides = reviews.filter((r) => r.action === "override" && r.newScore != null);
  const tally = new Map<string, { label: string; times: number; up: number; down: number }>();
  for (const r of overrides) {
    const p = await getProperty(r.radarId);
    if (!p) continue;
    const [item] = await scoreAll([p]);
    for (const m of item.score.matched) {
      const t = tally.get(m.id) ?? { label: m.label, times: 0, up: 0, down: 0 };
      t.times++;
      if (r.newScore! > item.score.baseScore) t.up++;
      if (r.newScore! < item.score.baseScore) t.down++;
      tally.set(m.id, t);
    }
  }
  const report = [...tally.values()].sort((a, b) => b.times - a.times);
  const agrees = reviews.filter((r) => r.action === "agree").length;

  const purchased = credits.filter((c) => c.action === "purchase_properties");
  const liveCredits = purchased.filter((c) => c.source === "live").reduce((n, c) => n + c.records, 0);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted">Admin only. Changes apply to every score right away.</p>
      </div>

      <SettingsForm signals={signals} buyBoxes={settings.buyBoxes} />

      <section className={card}>
        <h2 className="mb-1 text-lg font-bold">What the team overrides</h2>
        <p className="mb-4 text-sm text-muted">
          {overrides.length} score change{overrides.length === 1 ? "" : "s"} and {agrees} agreement{agrees === 1 ? "" : "s"} so far. Signals that keep showing up here may need different points.
        </p>
        {report.length === 0 ? (
          <p className="text-muted">No overrides yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {report.map((r) => (
              <li key={r.label} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-semibold">{r.label}</span>
                <span className="shrink-0 text-muted">
                  {r.times}× · {r.up} up, {r.down} down
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card}>
        <h2 className="mb-1 text-lg font-bold">PropertyRadar credits</h2>
        <p className="mb-4 text-sm text-muted">
          {liveCredits.toLocaleString()} credits used on live data. Previews are free. Records are never re-bought within 30 days.
        </p>
        {credits.length === 0 ? (
          <p className="text-muted">No pulls yet.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {credits.slice(0, 15).map((c) => (
              <li key={c.id} className="flex justify-between gap-3 py-2">
                <span>
                  {c.action === "preview" ? "Preview" : "Pull"} · {c.records} record{c.records === 1 ? "" : "s"}
                  {c.source === "demo" && <span className="text-muted"> (demo)</span>}
                </span>
                <span className="text-muted">{date(c.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
