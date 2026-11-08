import { describe, expect, it } from "vitest";
import { nearbyHighSales } from "./comps";
import {
  CONFIG,
  criterionMatches,
  knownCriterion,
  lotWidthFt,
  matchBuyBoxes,
  passesPrefilter,
  scoreProperty,
  withSettings,
} from "./scoring";
import type { Property } from "./types";

const NOW = new Date("2026-11-08T12:00:00Z");

/** A record with no signals at all: newer, mortgage-free fields unknown. */
function blank(overrides: Partial<Property> = {}): Property {
  return {
    radarId: "t",
    source: "demo",
    address: "1 Test St",
    city: "Chicago",
    state: "IL",
    zip: null,
    apn: null,
    lat: 41.91,
    lng: -87.68,
    propertyType: "SFR",
    units: 1,
    yearBuilt: 2010,
    sqft: null,
    lotSqft: null,
    estimatedValue: 900000,
    equityPercent: 10,
    equityAmount: null,
    openLoans: 0,
    totalLoanBalance: null,
    firstLoan: null,
    lastSaleDate: "2022-01-01",
    lastSalePrice: null,
    propertiesOwned: 1,
    ownerMailingState: "IL",
    vacant: false,
    distressFlags: [],
    hasOpenLiens: false,
    hasOpenPersonLiens: false,
    inDivorce: false,
    likelyListingScore: 10,
    purchasedAt: "2026-11-01T00:00:00Z",
    ...overrides,
  };
}

const ids = (p: Property, ctx = {}) => scoreProperty(p, { now: NOW, ...ctx }).matched.map((m) => m.id);

describe("config", () => {
  it("every criterion name in config has a field mapping", () => {
    const names = [
      ...CONFIG.prefilter.pr_criteria.map((c) => c.name),
      ...CONFIG.signals.flatMap((s) => [s.pr_criteria, ...(s.pr_criteria_any ?? [])].filter(Boolean).map((c) => c!.name)),
    ];
    for (const n of names) expect(knownCriterion(n), n).toBe(true);
  });

  it("no signal or prefilter uses an excluded field", () => {
    const used = JSON.stringify([CONFIG.signals, CONFIG.prefilter]);
    for (const f of CONFIG.excluded_fields) expect(used.includes(`"name":"${f}"`), f).toBe(false);
  });

  it("refuses to evaluate an excluded field", () => {
    expect(() => criterionMatches({ name: "Income", value: [[1, null]] }, blank())).toThrow(/Excluded/);
  });
});

describe("one property per signal", () => {
  const cases: [string, Partial<Property>, object?][] = [
    ["failed_listing", { distressFlags: ["isExpiredListing"] }],
    ["code_violations", { distressFlags: ["isCodeEnforcement"] }],
    ["teardown_visual", {}, { teardownConfirmed: true }],
    ["high_equity", { equityPercent: 50 }],
    ["long_ownership", { lastSaleDate: "2010-01-01" }],
    ["old_building", { yearBuilt: 1950 }],
    ["owns_multiple", { propertiesOwned: 2 }],
    ["vacant", { vacant: true }],
    ["nearby_high_sale", {}, { nearbyHighSale: { price: 1600000, address: "x" } }],
    ["open_mortgage", { openLoans: 1 }],
    ["estate_or_death", { distressFlags: ["inProbateProperty"] }],
    ["liens_or_litigation", { hasOpenPersonLiens: true }],
    ["out_of_state_owner", { distressFlags: ["isOutOfStateOwner"] }],
    ["divorce", { inDivorce: true }],
    ["likely_to_list", { likelyListingScore: 60 }],
  ];
  for (const [id, fields, ctx] of cases) {
    it(id, () => expect(ids(blank(fields), ctx)).toEqual([id]));
  }

  it("covers every enabled signal in config", () => {
    const enabled = CONFIG.signals.filter((s) => s.enabled !== false).map((s) => s.id).sort();
    expect(cases.map((c) => c[0]).sort()).toEqual(enabled);
  });
});

describe("scores and lists", () => {
  it("no data at all scores the minimum and goes to review", () => {
    const empty = blank({
      yearBuilt: null, equityPercent: null, openLoans: null, lastSaleDate: null, propertiesOwned: null,
      vacant: null, hasOpenLiens: null, hasOpenPersonLiens: null, inDivorce: null, likelyListingScore: null,
    });
    const r = scoreProperty(empty, { now: NOW });
    expect(r.matched).toEqual([]);
    expect(r.score).toBe(1);
    expect(r.list).toBe("review");
    expect(r.reason).toBe("1 — no signals found");
  });

  it("all signals clamps to 10 and goes to the call list", () => {
    const all = blank({
      distressFlags: ["isExpiredListing", "isCodeEnforcement", "inProbateProperty", "isOutOfStateOwner"],
      equityPercent: 80, lastSaleDate: "1990-01-01", yearBuilt: 1900, propertiesOwned: 3, vacant: true,
      openLoans: 1, hasOpenLiens: true, inDivorce: true, likelyListingScore: 90,
    });
    const r = scoreProperty(all, { now: NOW, teardownConfirmed: true, nearbyHighSale: { price: 2e6, address: "x" } });
    expect(r.matched).toHaveLength(15);
    expect(r.baseScore).toBe(10);
    expect(r.list).toBe("call");
  });

  it("points come from tiers: top 3, high 2, medium 1", () => {
    const r = scoreProperty(blank({ distressFlags: ["isCodeEnforcement"], propertiesOwned: 3, openLoans: 1 }), { now: NOW });
    expect(r.matched.map((m) => m.points)).toEqual([3, 2, 1]);
    expect(r.score).toBe(6);
    expect(r.list).toBe("call");
  });

  it("5 stays on the review list", () => {
    const r = scoreProperty(blank({ distressFlags: ["isCodeEnforcement"], propertiesOwned: 3 }), { now: NOW });
    expect(r.score).toBe(5);
    expect(r.list).toBe("review");
  });

  it("eyes-on sends a low score to the call list", () => {
    const r = scoreProperty(blank(), { now: NOW, eyesOn: true });
    expect(r.score).toBe(1);
    expect(r.list).toBe("call");
  });

  it("an override replaces the score and keeps the base score", () => {
    const r = scoreProperty(blank({ openLoans: 1 }), { now: NOW, override: { newScore: 7, reason: "Owner called us" } });
    expect(r.baseScore).toBe(1);
    expect(r.score).toBe(7);
    expect(r.overridden).toBe(true);
    expect(r.list).toBe("call");
  });

  it("divorce never appears in the one-line reason", () => {
    const r = scoreProperty(blank({ inDivorce: true, openLoans: 1 }), { now: NOW });
    expect(r.matched.map((m) => m.id)).toContain("divorce");
    expect(r.reason).not.toMatch(/divorce/i);
  });

  it("owner age stays off, and settings cannot switch it on", () => {
    const cfg = withSettings(CONFIG, { owner_age_70_plus: true, vacant: false });
    expect(cfg.signals.find((s) => s.id === "owner_age_70_plus")!.enabled).toBe(false);
    expect(scoreProperty(blank({ vacant: true }), { now: NOW }, cfg).matched).toEqual([]);
  });
});

describe("prefilter, lot width, buy boxes, comps", () => {
  it("prefilter keeps $700K+ houses, flats and land only", () => {
    expect(passesPrefilter(blank())).toBe(true);
    expect(passesPrefilter(blank({ estimatedValue: 650000 }))).toBe(false);
    expect(passesPrefilter(blank({ propertyType: "CND" }))).toBe(false);
    expect(passesPrefilter(blank({ estimatedValue: null }))).toBe(false);
  });

  it("estimates lot width as LotSize ÷ 125", () => {
    expect(lotWidthFt({ lotSqft: 3125 })).toBe(25);
    expect(lotWidthFt({ lotSqft: null })).toBeNull();
  });

  it("matches buy boxes and never counts unknown data as a fit", () => {
    const box = { id: "a", developer: "Developer A", min_lot_width_ft: 30, property_types: ["SFR", "LND"], max_land_price_usd: null, areas: ["Bucktown"], avoid: [] };
    expect(matchBuyBoxes(blank({ lotSqft: 6250, neighborhood: "Bucktown" }), [box])).toEqual(["Developer A"]);
    expect(matchBuyBoxes(blank({ lotSqft: 3125, neighborhood: "Bucktown" }), [box])).toEqual([]);
    expect(matchBuyBoxes(blank({ lotSqft: 6250 }), [box])).toEqual([]);
  });

  it("finds sales within 0.25 mi, 24 months, $1.5M+", () => {
    const p = blank({ lat: 41.92, lng: -87.68 });
    const near = { address: "near", lat: 41.921, lng: -87.68, price: 1_600_000, date: "2025-06-01" };
    const far = { ...near, address: "far", lat: 41.93 };
    const old = { ...near, address: "old", date: "2023-01-01" };
    const cheap = { ...near, address: "cheap", price: 1_200_000 };
    expect(nearbyHighSales(p, [near, far, old, cheap], CONFIG, NOW).map((s) => s.address)).toEqual(["near"]);
  });
});
