import { NextResponse } from "next/server";
import { parseRing } from "@/lib/geo";
import { currentSource, fetchArea } from "@/lib/sources";
import { saveSearch } from "@/lib/store";

/** Step 2 of a search, after the user confirmed the preview. May purchase records in live mode. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const ring = parseRing(body?.boundary);
  if (!ring) return NextResponse.json({ error: "Draw an area with at least 3 points first." }, { status: 400 });
  if (body?.confirmed !== true) {
    return NextResponse.json({ error: "Please confirm the search first." }, { status: 400 });
  }
  try {
    const properties = await fetchArea(ring);
    const previewCount = Number.isFinite(Number(body?.previewCount)) ? Number(body.previewCount) : null;
    const search = await saveSearch({ source: currentSource(), boundary: ring, previewCount, properties });
    return NextResponse.json({ search, properties });
  } catch (err) {
    console.error("search failed", err);
    return NextResponse.json({ error: "Couldn't load properties. Please try again." }, { status: 502 });
  }
}
