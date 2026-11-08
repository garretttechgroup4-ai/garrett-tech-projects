import { NextResponse } from "next/server";
import { anthropicKey } from "@/lib/claude";
import { mapsKey } from "@/lib/googlemaps";
import { currentSource } from "@/lib/sources";

/** Which services are connected (never the keys themselves). */
export async function GET() {
  return NextResponse.json({ source: currentSource(), claude: Boolean(anthropicKey()), imagery: Boolean(mapsKey()) });
}
