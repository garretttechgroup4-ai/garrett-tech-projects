import "server-only";
import scoring from "@/config/scoring.json";
import { apiKey, previewCount, purchase } from "../propertyradar";
import { freshIds, getProperty, logCredits, saveProperties } from "../store";
import type { DataSource, PreviewResult, Property, Ring } from "../types";
import { demoInArea } from "./demo";

const { repurchase_after_days: DAYS, max_records_per_pull: CAP } = scoring.credits;

/** Live when the PropertyRadar key is present, demo otherwise. Automatic. */
export function currentSource(): DataSource {
  return apiKey() ? "live" : "demo";
}

/** Step 1: how many properties, how many already cached, how many credits. Never buys. */
export async function previewArea(ring: Ring, boundaryId: string | null): Promise<PreviewResult & { radarIds: string[] | null }> {
  const source = currentSource();
  let count: number;
  let radarIds: string[] | null;
  if (source === "demo") {
    radarIds = demoInArea(ring).map((p) => p.radarId);
    count = radarIds.length;
  } else {
    ({ count, radarIds } = await previewCount(ring, CAP));
  }
  const have = radarIds ? (await freshIds(radarIds, DAYS)).size : 0;
  const needed = Math.max(0, Math.min(count, CAP) - have);
  await logCredits({ action: "preview", records: count, boundaryId, source });
  return { source, count, alreadyHave: have, credits: source === "demo" ? 0 : needed, cap: CAP, overCap: count > CAP, radarIds };
}

/** Step 2, after confirm: reuse cached records, buy only the rest, log credits. */
export async function fetchArea(ring: Ring, boundaryId: string): Promise<Property[]> {
  const source = currentSource();
  if (source === "demo") {
    const found = demoInArea(ring).slice(0, CAP);
    const fresh = await freshIds(found.map((p) => p.radarId), DAYS);
    const now = new Date().toISOString();
    const bought = found.filter((p) => !fresh.has(p.radarId)).map((p) => ({ ...p, purchasedAt: now }));
    await saveProperties(bought);
    await logCredits({ action: "purchase_properties", records: bought.length, boundaryId, source });
    return Promise.all(found.map(async (p) => (await getProperty(p.radarId)) ?? p));
  }

  const { radarIds } = await previewCount(ring, CAP);
  const fresh = radarIds ? await freshIds(radarIds, DAYS) : new Set<string>();
  const toBuy = radarIds ? radarIds.filter((id) => !fresh.has(id)) : null;
  const bought = toBuy && toBuy.length === 0 ? [] : await purchase(ring, toBuy, toBuy?.length ?? CAP);
  await saveProperties(bought);
  await logCredits({ action: "purchase_properties", records: bought.length, boundaryId, source });
  const cached = await Promise.all([...fresh].map((id) => getProperty(id)));
  return [...bought, ...cached.filter((p): p is Property => Boolean(p))];
}
