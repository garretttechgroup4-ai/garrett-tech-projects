/**
 * PropertyRadar client — server only (CLAUDE.md rules 1–3, 7).
 *
 * Names marked "confirm" in docs/field-map.md are assumptions until checked
 * against the live API Reference; they are all in FIELD_NAMES / normalize()
 * below so a correction touches only this file. See docs/build-notes.md.
 */
import "server-only";
import { CONFIG, type Criterion } from "./scoring";
import type { Property, Ring } from "./types";

const BASE_URL = "https://api.propertyradar.com/v1";

/** Exactly the fields on the property card (docs/field-map.md). */
export const FIELD_NAMES = [
  "RadarID", "Address", "City", "State", "ZipFive", "APN",
  "Latitude", "Longitude", // confirm
  "PType", "Units", "YearBuilt", "SqFt", "LotSize", "AVM",
  "AvailableEquity", "EquityPercent", "NumberLoans", "TotalLoanBalance",
  "FirstDate", "FirstAmount", "FirstPurpose",
  "LastTransferRecDate", "LastTransferValue", // confirm
  "NumberPropertiesOwned", "OwnerState", "isSameState", "isSiteVacant",
  "inDistress", // confirm: returned as a list of flag names
  "PropertyHasOpenLiens", "PropertyHasOpenPersonLiens", "PropertyOpenLiens",
  "inDivorce", "LikelyListingScore",
] as const;

/** Rule 3: refuse to ever request an excluded field. Checked at load time. */
export function assertAllowedFields(fields: readonly string[]) {
  const bad = fields.filter((f) => CONFIG.excluded_fields.includes(f));
  if (bad.length) throw new Error(`Refusing to request excluded fields: ${bad.join(", ")}`);
}
assertAllowedFields(FIELD_NAMES);

export function apiKey(): string | null {
  return process.env.PROPERTY_RADAR_API_KEY || null;
}

async function request(path: string, body: unknown, attempt = 0): Promise<Record<string, unknown>> {
  const key = apiKey();
  if (!key) throw new Error("PROPERTY_RADAR_API_KEY is not set");
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (res.status === 429 && attempt < 3) {
    const wait = Number(res.headers.get("retry-after")) * 1000 || 2000 * 2 ** attempt;
    await new Promise((r) => setTimeout(r, wait));
    return request(path, body, attempt + 1);
  }
  if (!res.ok) {
    // Never log the key or headers; the status and a short body are enough.
    const text = await res.text().catch(() => "");
    throw new Error(`PropertyRadar ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

/** Boundary + Joe's prefilter, as PropertyRadar Criteria. */
export function areaCriteria(ring: Ring): Criterion[] {
  const closed = [...ring, ring[0]];
  return [{ name: "Polygon", value: { type: "Polygon", coordinates: [closed] } }, ...CONFIG.prefilter.pr_criteria];
}

const rows = (data: Record<string, unknown>) => ((data.results ?? data.data ?? []) as Record<string, unknown>[]);

/**
 * Free preview (Purchase=0): the count, plus RadarIDs when the API returns
 * them without a purchase (confirm). Never costs credits.
 */
export async function previewCount(ring: Ring, limit: number): Promise<{ count: number; radarIds: string[] | null }> {
  const q = new URLSearchParams({ Purchase: "0", Limit: String(limit), Fields: "RadarID" });
  const data = await request(`/properties?${q}`, { Criteria: areaCriteria(ring) });
  const count = Number(data.resultCount ?? data.totalResultCount ?? rows(data).length ?? 0);
  const ids = rows(data).map((r) => String(r.RadarID ?? "")).filter(Boolean);
  return { count, radarIds: ids.length ? ids : null };
}

/**
 * Purchase (Purchase=1) — costs one export per record. Buys only the given
 * RadarIDs when known (confirm: RadarID criterion); otherwise the area, capped.
 * Pages through results 100 at a time.
 */
export async function purchase(ring: Ring, radarIds: string[] | null, limit: number): Promise<Property[]> {
  const criteria = radarIds ? [{ name: "RadarID", value: radarIds }] : areaCriteria(ring);
  const out: Property[] = [];
  const page = 100;
  for (let start = 0; start < limit; start += page) {
    const q = new URLSearchParams({ Purchase: "1", Limit: String(Math.min(page, limit - start)), Start: String(start), Fields: FIELD_NAMES.join(",") });
    const batch = rows(await request(`/properties?${q}`, { Criteria: criteria }));
    out.push(...batch.map(normalize));
    if (batch.length < page) break;
  }
  return out;
}

const num = (v: unknown) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
const bool = (v: unknown) => (v === null || v === undefined || v === "" ? null : v === 1 || v === "1" || v === true || v === "Y");
const str = (v: unknown) => (v === null || v === undefined || v === "" ? null : String(v));

/** The single PropertyRadar → Property mapping (docs/field-map.md). */
export function normalize(r: Record<string, unknown>): Property {
  const distress = Array.isArray(r.inDistress)
    ? (r.inDistress as unknown[]).map(String)
    : typeof r.inDistress === "string"
      ? r.inDistress.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
  if (r.isSameState === 0 || r.isSameState === false) distress.push("isOutOfStateOwner");
  const firstLoan =
    r.FirstDate || r.FirstAmount || r.FirstPurpose
      ? { date: str(r.FirstDate), amount: num(r.FirstAmount), purpose: str(r.FirstPurpose) }
      : null;
  return {
    radarId: String(r.RadarID),
    source: "live",
    address: String(r.Address ?? ""),
    city: String(r.City ?? "Chicago"),
    state: String(r.State ?? "IL"),
    zip: str(r.ZipFive),
    apn: str(r.APN),
    lat: Number(r.Latitude),
    lng: Number(r.Longitude),
    propertyType: str(r.PType),
    units: num(r.Units),
    yearBuilt: num(r.YearBuilt),
    sqft: num(r.SqFt),
    lotSqft: num(r.LotSize),
    estimatedValue: num(r.AVM),
    equityPercent: num(r.EquityPercent),
    equityAmount: num(r.AvailableEquity),
    openLoans: num(r.NumberLoans),
    totalLoanBalance: num(r.TotalLoanBalance),
    firstLoan,
    lastSaleDate: str(r.LastTransferRecDate),
    lastSalePrice: num(r.LastTransferValue),
    propertiesOwned: num(r.NumberPropertiesOwned),
    ownerMailingState: str(r.OwnerState),
    vacant: bool(r.isSiteVacant),
    distressFlags: [...new Set(distress)],
    hasOpenLiens: bool(r.PropertyHasOpenLiens),
    hasOpenPersonLiens: bool(r.PropertyHasOpenPersonLiens),
    inDivorce: bool(r.inDivorce),
    likelyListingScore: num(r.LikelyListingScore),
    purchasedAt: new Date().toISOString(),
    raw: r,
  };
}
