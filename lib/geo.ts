import type { Ring } from "./types";

/** Ray-casting point-in-polygon. Ring is [lng, lat] pairs. */
export function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function bbox(ring: Ring) {
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  return { minLng: Math.min(...lngs), maxLng: Math.max(...lngs), minLat: Math.min(...lats), maxLat: Math.max(...lats) };
}

/** Validates untrusted input into a Ring, or returns null. */
export function parseRing(input: unknown): Ring | null {
  if (!Array.isArray(input) || input.length < 3 || input.length > 200) return null;
  const ring: Ring = [];
  for (const p of input) {
    if (!Array.isArray(p) || p.length !== 2) return null;
    const [lng, lat] = p.map(Number);
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    ring.push([lng, lat]);
  }
  return ring;
}

/** Preset boundaries for quick-pick chips. Approximate neighborhood outlines. */
export const PRESET_AREAS: { name: string; ring: Ring }[] = [
  {
    name: "Bucktown",
    ring: [
      [-87.6874, 41.9250], [-87.6680, 41.9250], [-87.6676, 41.9140], [-87.6874, 41.9140],
    ],
  },
  {
    name: "Wicker Park",
    ring: [
      [-87.6874, 41.9140], [-87.6676, 41.9140], [-87.6676, 41.9030], [-87.6874, 41.9030],
    ],
  },
];
