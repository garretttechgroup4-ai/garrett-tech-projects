/**
 * PropertyRadar live source. Every endpoint, parameter and field name here
 * is marked "confirm" in docs/field-map.md — verify against the first live
 * response (use /api/propertyradar/explore) and correct in this file only.
 */
import { bbox, pointInRing } from "../geo";
import { applyDerivedSignals } from "../signals";
import type { Property, Ring } from "../types";

const BASE_URL = process.env.PROPERTYRADAR_BASE_URL || "https://api.propertyradar.com/v1";

const FIELDS = [
  "RadarID", "Address", "City", "State", "ZipFive", "Latitude", "Longitude", "PType", "Beds", "Baths", "SqFt",
  "LotSize", "YearBuilt", "AVM", "AvailableEquity", "EquityPercent", "LastTransferRecDate", "LastTransferValue",
  "Owner", "OwnerFirstName", "OwnerLastName", "MailAddress", "MailCity", "MailState", "MailZip",
  "isSameMailingOrExempt", "isListedForSale", "inForeclosure", "ForeclosureStage", "inTaxDelinquency",
  "isDeceasedProperty", "inProbate", "inDivorce", "inBankruptcy", "hasLiens", "LienCount", "isVacant",
  "isFreeAndClear", "TotalLoanBalance",
].join(",");

function getApiKey(): string {
  const key = process.env.PROPERTYRADAR_API;
  if (!key) throw new Error("PROPERTYRADAR_API is not set — the app should be in demo mode.");
  return key;
}

export async function propertyRadarRequest(pathAndQuery: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${pathAndQuery}`, {
    ...init,
    headers: { Authorization: `Bearer ${getApiKey()}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PropertyRadar request failed (${res.status}): ${body.slice(0, 500)}`);
  }
  return res.json();
}

/** Area criteria. confirm: replace with a polygon criterion if PropertyRadar has one. */
function areaCriteria(ring: Ring) {
  const b = bbox(ring);
  return [
    { name: "Latitude", value: [[b.minLat, b.maxLat]] },
    { name: "Longitude", value: [[b.minLng, b.maxLng]] },
  ];
}

/** Free count — no records purchased. */
export async function prCount(ring: Ring): Promise<number> {
  const data = await propertyRadarRequest(`/properties?Purchase=0&Limit=1`, {
    method: "POST",
    body: JSON.stringify({ Criteria: areaCriteria(ring) }),
  });
  return Number(data?.resultCount ?? data?.totalResultCount ?? data?.results?.length ?? 0);
}

/** Purchases up to `limit` records inside the bounding box, then trims to the exact shape. */
export async function prFetch(ring: Ring, limit: number): Promise<Property[]> {
  const q = new URLSearchParams({ Purchase: "1", Limit: String(limit), Fields: FIELDS });
  const data = await propertyRadarRequest(`/properties?${q}`, {
    method: "POST",
    body: JSON.stringify({ Criteria: areaCriteria(ring) }),
  });
  const rows: Record<string, unknown>[] = data?.results ?? data?.data ?? [];
  return rows.map(normalize).filter((p) => pointInRing(p.lng, p.lat, ring));
}

const PTYPE: Record<string, string> = {
  SFR: "Single-family", MFR: "Multi-family", CND: "Condo", TWN: "Townhouse", MXD: "Mixed-use", LND: "Land", COM: "Commercial",
};

const num = (v: unknown) => (v === null || v === undefined || v === "" || isNaN(Number(v)) ? null : Number(v));
const flag = (v: unknown) => v === 1 || v === "1" || v === true || v === "Y";
const str = (v: unknown) => (v === null || v === undefined || v === "" ? null : String(v));

/** The single PropertyRadar → Property mapping. See docs/field-map.md. */
export function normalize(r: Record<string, unknown>): Property {
  const signals: string[] = [];
  if (flag(r.inForeclosure) || str(r.ForeclosureStage)) signals.push("pre_foreclosure");
  if (flag(r.inTaxDelinquency)) signals.push("tax_delinquent");
  if (flag(r.isDeceasedProperty) || flag(r.inProbate)) signals.push("probate");
  if (flag(r.inDivorce)) signals.push("divorce");
  if (flag(r.inBankruptcy)) signals.push("bankruptcy");
  if (flag(r.hasLiens) || (num(r.LienCount) ?? 0) > 0) signals.push("liens");
  if (flag(r.isVacant)) signals.push("vacant");

  const mail = [r.MailAddress, r.MailCity, [r.MailState, r.MailZip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  let equityPercent = num(r.EquityPercent);
  if (flag(r.isFreeAndClear) || num(r.TotalLoanBalance) === 0) equityPercent = 100;

  const p: Property = {
    id: `pr_${r.RadarID}`,
    source: "live",
    address: String(r.Address ?? ""),
    city: String(r.City ?? ""),
    state: String(r.State ?? ""),
    zip: String(r.ZipFive ?? ""),
    lat: Number(r.Latitude),
    lng: Number(r.Longitude),
    propertyType: PTYPE[String(r.PType)] ?? String(r.PType ?? "Property"),
    beds: num(r.Beds),
    baths: num(r.Baths),
    sqft: num(r.SqFt),
    lotSqft: num(r.LotSize),
    yearBuilt: num(r.YearBuilt),
    estimatedValue: num(r.AVM),
    equityAmount: num(r.AvailableEquity),
    equityPercent,
    lastSaleDate: str(r.LastTransferRecDate),
    lastSalePrice: num(r.LastTransferValue),
    ownerName: str(r.Owner) ?? (str([r.OwnerFirstName, r.OwnerLastName].filter(Boolean).join(" "))),
    ownerMailingAddress: mail || null,
    ownerMailingState: str(r.MailState),
    ownerOccupied: r.isSameMailingOrExempt === undefined ? null : flag(r.isSameMailingOrExempt),
    listedForSale: r.isListedForSale === undefined ? null : flag(r.isListedForSale),
    signals,
    raw: r,
  };
  return applyDerivedSignals(p);
}

/** Phase 1 API check helpers. */
export const listLists = () => propertyRadarRequest("/lists");
export async function exploreSample(limit = 5) {
  return propertyRadarRequest(`/properties?Purchase=0&Limit=${limit}`, {
    method: "POST",
    body: JSON.stringify({ Criteria: [{ name: "State", value: ["IL"] }, { name: "City", value: ["Chicago"] }] }),
  });
}
