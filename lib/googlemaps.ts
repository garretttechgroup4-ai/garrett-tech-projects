/** Google Street View / aerial imagery, fetched server-side so the key never reaches the browser. Not stored. */
import "server-only";
import type { Property } from "./types";

export const mapsKey = () => process.env.GOOGLE_MAPS_API_KEY || null;

export type View = "street" | "aerial";

/** Returns the image response, or null when there's no key or no imagery. */
export async function fetchImagery(p: Property, view: View): Promise<Response | null> {
  const key = mapsKey();
  if (!key) return null;
  const location = encodeURIComponent(`${p.address}, ${p.city}, ${p.state} ${p.zip ?? ""}`.trim());
  if (view === "street") {
    const base = "https://maps.googleapis.com/maps/api/streetview";
    const meta = await fetch(`${base}/metadata?location=${location}&source=outdoor&key=${key}`).then((r) => r.json()).catch(() => null);
    if (meta?.status !== "OK") return null;
    const img = await fetch(`${base}?size=640x400&location=${location}&source=outdoor&key=${key}`);
    return img.ok ? img : null;
  }
  const img = await fetch(
    `https://maps.googleapis.com/maps/api/staticmap?center=${p.lat},${p.lng}&zoom=20&size=640x400&maptype=satellite&markers=color:red%7C${p.lat},${p.lng}&key=${key}`
  );
  return img.ok ? img : null;
}
