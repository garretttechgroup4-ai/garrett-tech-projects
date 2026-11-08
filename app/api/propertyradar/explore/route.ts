import { NextResponse } from "next/server";
import { currentSource } from "@/lib/sources";
import { exploreSample, listLists } from "@/lib/sources/propertyradar";

/**
 * Phase 1 API check: shows PropertyRadar's raw responses so docs/field-map.md
 * can be confirmed. Uses Purchase=0 (no records bought — confirm).
 */
export async function GET(request: Request) {
  if (currentSource() === "demo") {
    return NextResponse.json({ mode: "demo", message: "Add PROPERTYRADAR_API to .env.local to run the live API check." });
  }
  const limit = Math.min(Number(new URL(request.url).searchParams.get("limit") ?? 5) || 5, 10);
  const [lists, sample] = await Promise.allSettled([listLists(), exploreSample(limit)]);
  return NextResponse.json({
    mode: "live",
    lists: lists.status === "fulfilled" ? lists.value : { error: String(lists.reason?.message ?? lists.reason) },
    sample: sample.status === "fulfilled" ? sample.value : { error: String(sample.reason?.message ?? sample.reason) },
  });
}
