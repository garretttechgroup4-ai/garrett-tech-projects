import { NextResponse } from "next/server";
import { parseRing } from "@/lib/geo";
import { previewArea } from "@/lib/sources";

/** Step 1 of a search: how many properties are inside? Never purchases records. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const ring = parseRing(body?.boundary);
  if (!ring) return NextResponse.json({ error: "Draw an area with at least 3 points first." }, { status: 400 });
  try {
    return NextResponse.json(await previewArea(ring));
  } catch (err) {
    console.error("preview failed", err);
    return NextResponse.json({ error: "Couldn't reach the property data service. Please try again." }, { status: 502 });
  }
}
