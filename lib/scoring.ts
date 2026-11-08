/**
 * Pure scoring engine driven by config/scoring.json (CLAUDE.md "How scoring works").
 * No I/O. Safe on the server and in the browser.
 *
 * Signals with `pr_criteria` are evaluated generically against the record, so
 * the same criteria that are sent to PropertyRadar decide the match. Signals
 * with `computed` use a small named handler (years owned, teardown review,
 * nearby high sale).
 */
import defaultConfig from "@/config/scoring.json";
import type { BuyBox, Property } from "./types";

export type Tier = "top" | "high" | "medium";

export interface Criterion {
  name: string;
  value: unknown;
}

export interface SignalConfig {
  id: string;
  label: string;
  tier: Tier;
  enabled?: boolean;
  requires_legal_review?: boolean;
  pr_criteria?: Criterion;
  pr_criteria_any?: Criterion[];
  computed?: string;
  params?: Record<string, number>;
  display?: string;
}

export interface ScoringConfig {
  version: number;
  points: Record<Tier, number>;
  signals: SignalConfig[];
  thresholds: { call_list: number; score_min: number; score_max: number };
  prefilter: { pr_criteria: Criterion[] };
  project_rules: { min_project_size_usd: number };
  excluded_fields: string[];
}

export const CONFIG = defaultConfig as unknown as ScoringConfig;

/** Facts that don't come from the property record itself. */
export interface ScoringContext {
  now?: Date;
  /** A person confirmed the teardown look. */
  teardownConfirmed?: boolean;
  /** Result of the nearby-high-sale check; null/undefined = not checked. */
  nearbyHighSale?: { price: number; address: string } | null;
  /** A team member's site-visit flag. */
  eyesOn?: boolean;
  /** Latest human override of the score. */
  override?: { newScore: number; reason: string } | null;
}

export interface MatchedSignal {
  id: string;
  label: string;
  tier: Tier;
  points: number;
  evidence: string;
}

export interface ScoreResult {
  /** Final score shown everywhere (override wins). */
  score: number;
  /** Score from the signals alone, before any override. */
  baseScore: number;
  matched: MatchedSignal[];
  list: "call" | "review";
  eyesOn: boolean;
  overridden: boolean;
  /** One-line reason: "8 — code violations, owns 3 properties, 62% equity". */
  reason: string;
}

const YEAR_MS = 365.25 * 24 * 3600 * 1000;

function yearsSince(date: string | null, now: Date): number | null {
  if (!date) return null;
  const t = new Date(date).getTime();
  return Number.isNaN(t) ? null : Math.floor((now.getTime() - t) / YEAR_MS);
}

/** Criterion name → value on the record. Every name used in config must be here. */
const FIELD: Record<string, (p: Property, now: Date) => unknown> = {
  AVM: (p) => p.estimatedValue,
  EquityPercent: (p) => p.equityPercent,
  PropertyAge: (p, now) => (p.yearBuilt ? now.getFullYear() - p.yearBuilt : null),
  NumberPropertiesOwned: (p) => p.propertiesOwned,
  isSiteVacant: (p) => p.vacant,
  NumberLoans: (p) => p.openLoans,
  PropertyHasOpenLiens: (p) => p.hasOpenLiens,
  PropertyHasOpenPersonLiens: (p) => p.hasOpenPersonLiens,
  inDivorce: (p) => p.inDivorce,
  LikelyListingScore: (p) => p.likelyListingScore,
  inDistress: (p) => p.distressFlags,
  PType: (p) => p.propertyType,
  // Owner age is never stored while the signal is legally gated.
  Age: () => null,
};

export function knownCriterion(name: string) {
  return name in FIELD || name === "PropertyType" || name === "Polygon";
}

/** Does one PropertyRadar criterion match this record? Missing data never matches. */
export function criterionMatches(c: Criterion, p: Property, now = new Date(), cfg: ScoringConfig = CONFIG): boolean {
  if (cfg.excluded_fields.includes(c.name)) throw new Error(`Excluded field used in criteria: ${c.name}`);
  if (c.name === "PropertyType") {
    const inner = (c.value as Criterion[])[0];
    return criterionMatches(inner, p, now, cfg);
  }
  const get = FIELD[c.name];
  if (!get) throw new Error(`No field mapping for criterion "${c.name}" — add it to lib/scoring.ts`);
  const actual = get(p, now);
  if (actual === null || actual === undefined) return false;
  const values = c.value as unknown[];

  // Range: [[min, max]] with null = open-ended.
  if (Array.isArray(values[0])) {
    const [min, max] = values[0] as (number | null)[];
    const n = Number(actual);
    return (min == null || n >= min) && (max == null || n <= max);
  }
  // Set membership: ["isExpiredListing", …] against a list or a single value.
  if (typeof values[0] === "string") {
    return Array.isArray(actual) ? values.some((v) => (actual as unknown[]).includes(v)) : values.includes(actual);
  }
  // Flag: [1]
  if (values[0] === 1 || values[0] === true) return actual === true || actual === 1;
  return false;
}

export function passesPrefilter(p: Property, cfg: ScoringConfig = CONFIG, now = new Date()): boolean {
  return cfg.prefilter.pr_criteria.every((c) => criterionMatches(c, p, now, cfg));
}

const DISTRESS_EVIDENCE: Record<string, string> = {
  isExpiredListing: "listing expired",
  isCodeEnforcement: "code enforcement on record",
  isDeceasedProperty: "deceased owner on record",
  inProbateProperty: "in probate",
  isDeceasedJointTenant: "deceased joint owner",
  isOutOfStateOwner: "owner mails out of state",
};

const money = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(2).replace(/\.?0+$/, "")}M` : `$${Math.round(n / 1000)}K`);

/** Short, factual evidence for a matched signal. */
function evidenceFor(s: SignalConfig, p: Property, ctx: ScoringContext, now: Date): string {
  switch (s.id) {
    case "high_equity": return `${p.equityPercent}% equity`;
    case "long_ownership": return `owned ${yearsSince(p.lastSaleDate, now)} years`;
    case "old_building": return `built ${p.yearBuilt}`;
    case "owns_multiple": return `owns ${p.propertiesOwned} properties`;
    case "vacant": return "vacant (USPS)";
    case "open_mortgage": return `${p.openLoans} open loan${p.openLoans === 1 ? "" : "s"}`;
    case "likely_to_list": return `likely-to-list ${p.likelyListingScore}`;
    case "out_of_state_owner": return p.ownerMailingState ? `owner mails to ${p.ownerMailingState}` : "out-of-state owner";
    case "liens_or_litigation": return "open liens";
    case "divorce": return "divorce filing (flag only)";
    case "teardown_visual": return "teardown look confirmed";
    case "nearby_high_sale": return ctx.nearbyHighSale ? `${money(ctx.nearbyHighSale.price)} sale nearby` : "high sale nearby";
    case "code_violations": return "code violations";
    case "failed_listing": return "tried to sell before";
    default: {
      const hit = p.distressFlags.find((f) => DISTRESS_EVIDENCE[f]);
      return hit ? DISTRESS_EVIDENCE[hit] : s.label.toLowerCase();
    }
  }
}

function signalMatches(s: SignalConfig, p: Property, ctx: ScoringContext, now: Date, cfg: ScoringConfig): boolean {
  if (s.enabled === false) return false;
  if (s.pr_criteria) return criterionMatches(s.pr_criteria, p, now, cfg);
  if (s.pr_criteria_any) return s.pr_criteria_any.some((c) => criterionMatches(c, p, now, cfg));
  switch (s.id) {
    case "long_ownership": {
      const years = yearsSince(p.lastSaleDate, now);
      return years != null && years >= (s.params?.years_min ?? 15);
    }
    case "teardown_visual":
      return ctx.teardownConfirmed === true;
    case "nearby_high_sale":
      return Boolean(ctx.nearbyHighSale);
    default:
      return false;
  }
}

/** Signals that never appear in the one-line reason (CLAUDE.md: divorce is a flag only). */
const NOT_IN_REASON = new Set(["divorce"]);

export function scoreProperty(p: Property, ctx: ScoringContext = {}, cfg: ScoringConfig = CONFIG): ScoreResult {
  const now = ctx.now ?? new Date();
  const matched: MatchedSignal[] = cfg.signals
    .filter((s) => signalMatches(s, p, ctx, now, cfg))
    .map((s) => ({ id: s.id, label: s.label, tier: s.tier, points: cfg.points[s.tier], evidence: evidenceFor(s, p, ctx, now) }))
    .sort((a, b) => b.points - a.points);

  const { score_min, score_max, call_list } = cfg.thresholds;
  const clamp = (n: number) => Math.max(score_min, Math.min(score_max, n));
  const baseScore = clamp(matched.reduce((sum, m) => sum + m.points, 0));
  const overridden = Boolean(ctx.override);
  const score = overridden ? clamp(ctx.override!.newScore) : baseScore;
  const eyesOn = ctx.eyesOn === true;
  const list = eyesOn || score >= call_list ? "call" : "review";

  const reasons = matched.filter((m) => !NOT_IN_REASON.has(m.id)).slice(0, 3).map((m) => m.evidence);
  const reason = `${score} — ${reasons.length ? reasons.join(", ") : "no signals found"}`;

  return { score, baseScore, matched, list, eyesOn, overridden, reason };
}

/** Lot width estimate: LotSize ÷ 125 (standard Chicago lot depth). Always labeled "estimated". */
export function lotWidthFt(p: Pick<Property, "lotSqft">): number | null {
  return p.lotSqft ? Math.round((p.lotSqft / 125) * 10) / 10 : null;
}

export function yearsOwned(p: Pick<Property, "lastSaleDate">, now = new Date()): number | null {
  return yearsSince(p.lastSaleDate, now);
}

/** Developers whose buy box this property fits. Unknown data never counts as a fit. */
export function matchBuyBoxes(p: Property, boxes: BuyBox[]): string[] {
  const width = lotWidthFt(p);
  return boxes
    .filter((b) => {
      if (b.min_lot_width_ft != null && (width == null || width < b.min_lot_width_ft)) return false;
      if (b.property_types.length && (!p.propertyType || !b.property_types.includes(p.propertyType))) return false;
      if (b.max_land_price_usd != null && (p.estimatedValue == null || p.estimatedValue > b.max_land_price_usd)) return false;
      if (b.areas.length && (!p.neighborhood || !b.areas.includes(p.neighborhood))) return false;
      return true;
    })
    .map((b) => b.developer);
}

/** $1M+ project rule — shown as a pass/fail tag, not part of the score. */
export function meetsProjectSize(p: Pick<Property, "estimatedValue">, cfg: ScoringConfig = CONFIG): boolean | null {
  return p.estimatedValue == null ? null : p.estimatedValue >= cfg.project_rules.min_project_size_usd;
}

/** Applies admin settings (signal on/off) to the config. Legally gated signals can't be switched on here. */
export function withSettings(cfg: ScoringConfig, signalToggles: Record<string, boolean>): ScoringConfig {
  return {
    ...cfg,
    signals: cfg.signals.map((s) => {
      if (!(s.id in signalToggles)) return s;
      if (s.requires_legal_review && signalToggles[s.id]) return s; // stays as config says
      return { ...s, enabled: signalToggles[s.id] };
    }),
  };
}
