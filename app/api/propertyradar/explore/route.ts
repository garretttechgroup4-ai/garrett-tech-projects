import { NextResponse } from "next/server";
import { CONFIG } from "@/lib/scoring";
import { apiKey, FIELD_NAMES } from "@/lib/propertyradar";

/**
 * Phase 1 API check: one free (Purchase=0) request for Chicago + Joe's prefilter,
 * returning PropertyRadar's raw response so docs/field-map.md "confirm" items can be resolved.
 */
export async function GET() {
  const key = apiKey();
  if (!key) return NextResponse.json({ mode: "demo", message: "Add PROPERTY_RADAR_API_KEY to .env.local to run the live API check." });
  const q = new URLSearchParams({ Purchase: "0", Limit: "3", Fields: FIELD_NAMES.join(",") });
  const res = await fetch(`https://api.propertyradar.com/v1/properties?${q}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ Criteria: [{ name: "State", value: ["IL"] }, { name: "City", value: ["Chicago"] }, ...CONFIG.prefilter.pr_criteria] }),
    cache: "no-store",
  });
  return NextResponse.json({ mode: "live", status: res.status, fieldsRequested: FIELD_NAMES, response: await res.json().catch(() => null) });
}
