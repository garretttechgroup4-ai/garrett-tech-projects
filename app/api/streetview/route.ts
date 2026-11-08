import { getProperty } from "@/lib/store";

/**
 * Street View photo for a known property. Proxied so GOOGLE_MAPS_API_KEY
 * never reaches the browser, and limited to properties we know about so it
 * can't be used as an open proxy. 404 when there's no key or no imagery.
 */
export async function GET(request: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!key) return new Response(null, { status: 404 });
  const p = await getProperty(id);
  if (!p) return new Response(null, { status: 404 });

  const location = encodeURIComponent(`${p.address}, ${p.city}, ${p.state} ${p.zip}`);
  const base = "https://maps.googleapis.com/maps/api/streetview";
  const meta = await fetch(`${base}/metadata?location=${location}&source=outdoor&key=${key}`).then((r) => r.json()).catch(() => null);
  if (meta?.status !== "OK") return new Response(null, { status: 404 });

  const img = await fetch(`${base}?size=640x400&location=${location}&source=outdoor&key=${key}`);
  if (!img.ok) return new Response(null, { status: 404 });
  return new Response(img.body, {
    headers: { "Content-Type": img.headers.get("Content-Type") ?? "image/jpeg", "Cache-Control": "public, max-age=86400" },
  });
}
