import { NextResponse } from "next/server";
import { currentSource } from "@/lib/sources";

export async function GET() {
  return NextResponse.json({ source: currentSource(), streetView: Boolean(process.env.GOOGLE_MAPS_API_KEY) });
}
