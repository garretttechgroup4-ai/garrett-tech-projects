import { NextResponse } from "next/server";
import { parseRing } from "@/lib/geo";
import { previewArea } from "@/lib/sources";

/** Step 1 of a search: count, cached records and credit cost. Never purchases. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const ring = parseRing(body?.boundary);
  if (!ring) return NextResponse.json({ error: "Draw an area with at least 3 points first." }, { status: 400 });
  try {
    const { radarIds: _ids, ...preview } = await previewArea(ring, null);
    void _ids;
    return NextResponse.json(preview);
  } catch (err) {
    console.error("preview failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't reach PropertyRadar. Please try again." }, { status: 502 });
  }
}
