import { MAX_RESULTS } from "../config";
import { bbox } from "../geo";
import type { DataSource, PreviewResult, Property, Ring } from "../types";
import { demoInArea } from "./demo";
import { prCount, prFetch } from "./propertyradar";

/** Live when the PropertyRadar key is present, demo otherwise. Automatic. */
export function currentSource(): DataSource {
  return process.env.PROPERTYRADAR_API ? "live" : "demo";
}

export async function previewArea(ring: Ring): Promise<PreviewResult> {
  const source = currentSource();
  if (source === "demo") {
    const count = demoInArea(ring).length;
    return { source, count, recordsToUse: 0, cap: MAX_RESULTS, overCap: count > MAX_RESULTS, approximate: false };
  }
  const count = await prCount(ring);
  const b = bbox(ring);
  // Approximate unless the drawn shape is its own bounding box (rectangle).
  const isRect = ring.length === 4 && ring.every(([x, y]) => (x === b.minLng || x === b.maxLng) && (y === b.minLat || y === b.maxLat));
  return {
    source,
    count,
    recordsToUse: Math.min(count, MAX_RESULTS),
    cap: MAX_RESULTS,
    overCap: count > MAX_RESULTS,
    approximate: !isRect,
  };
}

export async function fetchArea(ring: Ring): Promise<Property[]> {
  const props = currentSource() === "demo" ? demoInArea(ring).slice(0, MAX_RESULTS) : await prFetch(ring, MAX_RESULTS);
  return props.sort((a, b) => b.signals.length - a.signals.length || (b.equityPercent ?? 0) - (a.equityPercent ?? 0));
}
