import { SIGNAL_BY_ID } from "./config";
import type { Property } from "./types";

/** Signals computed from facts rather than reported by the data source. */
export const DERIVED_SIGNALS = ["absentee_owner", "out_of_state_owner", "high_equity", "free_and_clear", "long_term_owner"];

/**
 * Recomputes the derived signals from the property's facts using the
 * thresholds in config/scoring.json, and keeps event signals (foreclosure,
 * probate, …) as reported. Used by every data source so they all agree.
 */
export function applyDerivedSignals(p: Property, now = new Date()): Property {
  const events = p.signals.filter((s) => !DERIVED_SIGNALS.includes(s));
  const derived: string[] = [];

  if (p.ownerOccupied === false) derived.push("absentee_owner");
  if (p.ownerMailingState && p.state && p.ownerMailingState.toUpperCase() !== p.state.toUpperCase()) {
    derived.push("out_of_state_owner");
  }
  const eqMin = SIGNAL_BY_ID.high_equity?.threshold?.equityPercentMin ?? 50;
  if (p.equityPercent != null && p.equityPercent >= eqMin) derived.push("high_equity");
  if (p.equityPercent != null && p.equityPercent >= 100) derived.push("free_and_clear");
  const yrsMin = SIGNAL_BY_ID.long_term_owner?.threshold?.yearsOwnedMin ?? 15;
  if (p.lastSaleDate) {
    const years = (now.getTime() - new Date(p.lastSaleDate).getTime()) / (365.25 * 24 * 3600 * 1000);
    if (years >= yrsMin) derived.push("long_term_owner");
  }
  return { ...p, signals: [...events, ...derived.filter((s) => SIGNAL_BY_ID[s])] };
}
