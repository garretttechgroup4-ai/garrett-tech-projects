/**
 * Deterministic 0–100 deal score from config/scoring.json. No AI, no I/O,
 * safe to run on the server or in the browser.
 */
import scoring from "@/config/scoring.json";
import { orderedSignals } from "./config";
import type { Property } from "./types";

export type BandId = "hot" | "warm" | "cold";

export interface Band {
  id: BandId;
  label: string;
  min: number;
}

export interface ScoreResult {
  score: number;
  band: Band;
  /** Each signal's contribution, biggest first. */
  breakdown: { id: string; label: string; points: number }[];
  /** True when the score qualifies for an AI write-up. */
  aiEligible: boolean;
}

const BANDS = [...(scoring.scoring.bands as Band[])].sort((a, b) => b.min - a.min);
const MAX = scoring.scoring.maxScore;
export const AI_MIN_SCORE: number = scoring.scoring.aiRationaleMinScore;

export function scoreProperty(p: Pick<Property, "signals">): ScoreResult {
  const breakdown = orderedSignals(p.signals)
    .map((s) => ({ id: s.id, label: s.label, points: s.weight }))
    .sort((a, b) => b.points - a.points);
  const score = Math.min(MAX, breakdown.reduce((sum, b) => sum + b.points, 0));
  const band = BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1];
  return { score, band, breakdown, aiEligible: score >= AI_MIN_SCORE };
}

/** Best deals first: score, then equity. */
export function byScore<T extends Pick<Property, "signals" | "equityPercent">>(a: T, b: T) {
  return scoreProperty(b).score - scoreProperty(a).score || (b.equityPercent ?? 0) - (a.equityPercent ?? 0);
}

export const BAND_COLOR: Record<BandId, string> = { hot: "#dc2626", warm: "#d97706", cold: "#94a3b8" };

/** Map pin color by deal band. */
export function pinColor(signalIds: string[]): string {
  return BAND_COLOR[scoreProperty({ signals: signalIds }).band.id];
}
