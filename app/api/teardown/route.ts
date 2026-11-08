import { NextResponse } from "next/server";
import { anthropicKey, friendlyAIError, teardownReview } from "@/lib/claude";
import { fetchImagery, mapsKey } from "@/lib/googlemaps";
import { getProperty, saveTeardownAI } from "@/lib/store";

/** POST { radarId } → Claude's teardown call on the live street image. A person confirms it separately. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const p = typeof body?.radarId === "string" ? await getProperty(body.radarId) : null;
  if (!p) return NextResponse.json({ error: "Property not found." }, { status: 404 });
  if (!mapsKey() || !anthropicKey()) {
    return NextResponse.json({ error: "Needs the Google Maps and Anthropic keys. You can still mark it yourself below." }, { status: 400 });
  }
  const img = await fetchImagery(p, "street");
  if (!img) return NextResponse.json({ error: "No street photo for this address. Mark it yourself below." }, { status: 404 });
  const mediaType = img.headers.get("content-type")?.includes("png") ? "image/png" : "image/jpeg";
  const data = Buffer.from(await img.arrayBuffer()).toString("base64");
  try {
    const result = await teardownReview({ data, mediaType }, `${p.address}, ${p.city}`);
    await saveTeardownAI(p.radarId, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("teardown review failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: friendlyAIError(err) }, { status: 502 });
  }
}
