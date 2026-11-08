import { NextResponse } from "next/server";
import { parseRing } from "@/lib/geo";
import { scoreAll } from "@/lib/scored";
import { currentSource, fetchArea } from "@/lib/sources";
import { saveBoundary, saveSearch } from "@/lib/store";

/** Step 2, only after the confirm click. May purchase records in live mode. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const ring = parseRing(body?.boundary);
  if (!ring) return NextResponse.json({ error: "Draw an area with at least 3 points first." }, { status: 400 });
  if (body?.confirmed !== true) return NextResponse.json({ error: "Please confirm the search first." }, { status: 400 });
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : "Untitled area";
  try {
    const boundary = await saveBoundary(name, ring);
    const properties = await fetchArea(ring, boundary.id);
    const previewCount = Number.isFinite(Number(body?.previewCount)) ? Number(body.previewCount) : null;
    const search = await saveSearch({
      source: currentSource(), boundaryId: boundary.id, boundaryName: boundary.name, boundary: ring,
      previewCount, radarIds: properties.map((p) => p.radarId),
    });
    return NextResponse.json({ search, items: await scoreAll(properties) });
  } catch (err) {
    console.error("search failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't load properties. Please try again." }, { status: 502 });
  }
}
