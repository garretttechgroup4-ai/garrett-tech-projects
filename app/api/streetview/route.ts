import { fetchImagery } from "@/lib/googlemaps";
import { getProperty } from "@/lib/store";

/**
 * Live street or aerial image for a known property (?id=&view=street|aerial).
 * Proxied so the key stays on the server; streamed, never stored. 404 = show placeholder.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const p = await getProperty(params.get("id") ?? "");
  if (!p) return new Response(null, { status: 404 });
  const img = await fetchImagery(p, params.get("view") === "aerial" ? "aerial" : "street");
  if (!img) return new Response(null, { status: 404 });
  return new Response(img.body, { headers: { "Content-Type": img.headers.get("Content-Type") ?? "image/jpeg", "Cache-Control": "private, max-age=3600" } });
}
