/**
 * Server-side: score properties with everything the pure engine needs —
 * admin settings, team reviews (eyes-on, overrides, teardown) and nearby sales.
 */
import "server-only";
import { nearbyHighSales } from "./comps";
import { CONFIG, lotWidthFt, matchBuyBoxes, meetsProjectSize, scoreProperty, withSettings, yearsOwned, type ScoreResult, type ScoringContext } from "./scoring";
import { DEMO_SALES } from "./sources/demo";
import { allReviews, getSettings } from "./store";
import type { ComparableSale, Property, Review } from "./types";

export interface ScoredItem {
  property: Omit<Property, "raw">;
  score: ScoreResult;
  fits: string[];
  projectOk: boolean | null;
  lotWidth: number | null;
  yearsOwned: number | null;
  /** null = comps not available for this source yet. */
  nearbySales: (ComparableSale & { miles: number })[] | null;
}

export async function effectiveConfig() {
  return withSettings(CONFIG, (await getSettings()).signalToggles);
}

function contextFrom(p: Property, reviews: Review[], sales: ComparableSale[] | null): ScoringContext {
  const mine = reviews.filter((r) => r.radarId === p.radarId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const lastTeardown = mine.filter((r) => r.action === "teardown_confirmed" || r.action === "teardown_rejected").at(-1);
  const lastOverride = mine.filter((r) => r.action === "override" && r.newScore != null).at(-1);
  const near = sales ? nearbyHighSales(p, sales)[0] : undefined;
  return {
    teardownConfirmed: lastTeardown?.action === "teardown_confirmed",
    eyesOn: mine.some((r) => r.action === "eyes_on"),
    override: lastOverride ? { newScore: lastOverride.newScore!, reason: lastOverride.reason } : null,
    nearbyHighSale: near ? { price: near.price, address: near.address } : null,
  };
}

export async function scoreAll(props: Property[]): Promise<ScoredItem[]> {
  const [reviews, settings, cfg] = await Promise.all([allReviews(), getSettings(), effectiveConfig()]);
  return props.map((p) => {
    // Comps: demo sales file today. Live comps need the PropertyRadar transactions endpoint (confirm).
    const sales = p.source === "demo" ? DEMO_SALES : null;
    const ctx = contextFrom(p, reviews, sales);
    const { raw: _raw, ...property } = p;
    void _raw;
    return {
      property,
      score: scoreProperty(p, ctx, cfg),
      fits: matchBuyBoxes(p, settings.buyBoxes),
      projectOk: meetsProjectSize(p, cfg),
      lotWidth: lotWidthFt(p),
      yearsOwned: yearsOwned(p),
      nearbySales: sales ? nearbyHighSales(p, sales, cfg) : null,
    };
  }).sort((a, b) => b.score.score - a.score.score || (b.property.equityPercent ?? 0) - (a.property.equityPercent ?? 0));
}
