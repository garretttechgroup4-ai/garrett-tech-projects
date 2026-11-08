import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { CONFIG } from "@/lib/scoring";
import { getSettings, saveSettings } from "@/lib/store";
import type { BuyBox } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await getSettings());
}

const strList = (v: unknown) => (Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 30) : []);
const numOrNull = (v: unknown) => (v === null || v === "" || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v));

/** Admin settings: signal on/off and buy boxes. Legally gated signals can't be switched on here. */
export async function PUT(request: Request) {
  const b = await request.json().catch(() => null);
  const toggles: Record<string, boolean> = {};
  for (const s of CONFIG.signals) {
    if (typeof b?.signalToggles?.[s.id] === "boolean" && !s.requires_legal_review) toggles[s.id] = b.signalToggles[s.id];
  }
  const buyBoxes: BuyBox[] = (Array.isArray(b?.buyBoxes) ? b.buyBoxes : []).slice(0, 20).flatMap((x: Record<string, unknown>) => {
    const developer = typeof x?.developer === "string" ? x.developer.trim().slice(0, 80) : "";
    if (!developer) return [];
    return [{
      id: typeof x.id === "string" && x.id ? x.id : randomUUID(),
      developer,
      min_lot_width_ft: numOrNull(x.min_lot_width_ft),
      property_types: strList(x.property_types),
      max_land_price_usd: numOrNull(x.max_land_price_usd),
      areas: strList(x.areas),
      avoid: strList(x.avoid),
      notes: typeof x.notes === "string" ? x.notes.slice(0, 500) : undefined,
    }];
  });
  await saveSettings({ signalToggles: toggles, buyBoxes });
  return NextResponse.json(await getSettings());
}
