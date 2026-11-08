import { NextResponse } from "next/server";
import { scoreAll } from "@/lib/scored";
import { currentSource } from "@/lib/sources";
import { latestSearch } from "@/lib/store";

/** The last search, re-scored with current reviews and settings. */
export async function GET() {
  const latest = await latestSearch(currentSource());
  if (!latest) return NextResponse.json(null);
  return NextResponse.json({ search: latest.search, items: await scoreAll(latest.properties) });
}
