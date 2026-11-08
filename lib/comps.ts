/** Nearby high sales (feeds the `nearby_high_sale` signal). Pure. */
import { CONFIG, type ScoringConfig } from "./scoring";
import type { ComparableSale, Property } from "./types";

export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function highSaleParams(cfg: ScoringConfig = CONFIG) {
  const s = cfg.signals.find((x) => x.id === "nearby_high_sale");
  return { radius_mi: s?.params?.radius_mi ?? 0.25, months: s?.params?.months ?? 24, min_price_usd: s?.params?.min_price_usd ?? 1_500_000 };
}

/** Sales within the radius and time window above the price floor, highest first. */
export function nearbyHighSales(p: Property, sales: ComparableSale[], cfg: ScoringConfig = CONFIG, now = new Date()) {
  const { radius_mi, months, min_price_usd } = highSaleParams(cfg);
  const since = new Date(now);
  since.setMonth(since.getMonth() - months);
  return sales
    .filter((s) => s.price >= min_price_usd && new Date(s.date) >= since)
    .map((s) => ({ ...s, miles: milesBetween(p, s) }))
    .filter((s) => s.miles <= radius_mi)
    .sort((a, b) => b.price - a.price);
}
