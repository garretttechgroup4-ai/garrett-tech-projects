import { NextResponse } from "next/server";
import { aiSummaries, anthropicKey, autoSummary, friendlyAIError, summaryKey } from "@/lib/claude";
import { scoreAll } from "@/lib/scored";
import { CONFIG } from "@/lib/scoring";
import { getProperty, getSummaries, saveSummaries, type Summary } from "@/lib/store";

const BATCH = 20;

/**
 * POST { radarIds } → one-line reason per property.
 * Cached AI lines are reused; up to 20 missing ones are written by Claude per call
 * (the client asks again for the rest). Without a key: the automatic line.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.radarIds) ? body.radarIds.filter((x: unknown) => typeof x === "string").slice(0, 300) : [];
  const props = (await Promise.all(ids.map(getProperty))).filter((p) => p !== null);
  const items = await scoreAll(props);
  const keys = new Map(items.map((i) => [i.property.radarId, summaryKey(i, CONFIG.version)]));
  const cached = await getSummaries([...keys.values()]);

  const out: Record<string, Summary> = {};
  const missing = items.filter((i) => !cached[keys.get(i.property.radarId)!]);
  for (const i of items) out[i.property.radarId] = cached[keys.get(i.property.radarId)!] ?? autoSummary(i);

  let note: string | null = null;
  let pending = 0;
  if (anthropicKey() && missing.length) {
    const batch = missing.slice(0, BATCH);
    pending = missing.length - batch.length;
    try {
      const lines = await aiSummaries(batch);
      const now = new Date().toISOString();
      const fresh: Record<string, Summary> = {};
      for (const i of batch) {
        const line = lines[i.property.radarId];
        if (!line) continue;
        const s: Summary = { text: line, kind: "ai", createdAt: now };
        fresh[keys.get(i.property.radarId)!] = s;
        out[i.property.radarId] = s;
      }
      await saveSummaries(fresh);
    } catch (err) {
      console.error("summaries failed:", err instanceof Error ? err.message : err);
      note = friendlyAIError(err);
      pending = 0;
    }
  }
  return NextResponse.json({ summaries: out, pending, note, claude: Boolean(anthropicKey()) });
}
