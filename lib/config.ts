import scoring from "@/config/scoring.json";

export type Tone = "urgent" | "warning" | "info" | "positive";

export interface SignalDef {
  id: string;
  label: string;
  description: string;
  weight: number;
  tone: Tone;
  threshold?: { equityPercentMin?: number; yearsOwnedMin?: number };
  source: string;
}

export const SIGNALS: SignalDef[] = scoring.signals as SignalDef[];
export const SIGNAL_BY_ID: Record<string, SignalDef> = Object.fromEntries(SIGNALS.map((s) => [s.id, s]));
export const MAX_RESULTS: number = scoring.search.maxResultsPerSearch;
export const CONFIG_VERSION: number = scoring.version;

const TONE_ORDER: Record<Tone, number> = { urgent: 0, warning: 1, info: 2, positive: 3 };

/** Signals in display order (most urgent first), unknown ids dropped. */
export function orderedSignals(ids: string[]): SignalDef[] {
  return ids
    .map((id) => SIGNAL_BY_ID[id])
    .filter(Boolean)
    .sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone] || b.weight - a.weight);
}

/** Pin color by the most serious signal: red urgent, amber warning, blue other, grey none. */
export function pinColor(signalIds: string[]): string {
  const tones = signalIds.map((s) => SIGNAL_BY_ID[s]?.tone);
  if (tones.includes("urgent")) return "#dc2626";
  if (tones.includes("warning")) return "#d97706";
  return signalIds.length ? "#2563eb" : "#94a3b8";
}
