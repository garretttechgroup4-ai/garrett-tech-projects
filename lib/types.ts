/** [lng, lat] pairs, GeoJSON order. First point is NOT repeated at the end. */
export type Ring = [number, number][];

export type DataSource = "demo" | "live";

/**
 * The one normalized property record. Every field maps to a row in
 * docs/field-map.md; null means "Not found". Nothing here is guessed.
 */
export interface Property {
  /** PropertyRadar RadarID (demo records use demo_###). */
  radarId: string;
  source: DataSource;
  address: string;
  city: string;
  state: string;
  zip: string | null;
  /** Neighborhood name, demo data only (PropertyRadar has no such field). */
  neighborhood?: string;
  /** Cook County PIN. */
  apn: string | null;
  lat: number;
  lng: number;
  /** PropertyRadar PType code: SFR, MFR, LND, CND, … */
  propertyType: string | null;
  units: number | null;
  yearBuilt: number | null;
  sqft: number | null;
  lotSqft: number | null;
  /** AVM. */
  estimatedValue: number | null;
  equityPercent: number | null;
  equityAmount: number | null;
  openLoans: number | null;
  totalLoanBalance: number | null;
  firstLoan: { date: string | null; amount: number | null; purpose: string | null } | null;
  lastSaleDate: string | null;
  lastSalePrice: number | null;
  propertiesOwned: number | null;
  ownerMailingState: string | null;
  vacant: boolean | null;
  /** inDistress values returned by PropertyRadar (isExpiredListing, isCodeEnforcement, …). */
  distressFlags: string[];
  hasOpenLiens: boolean | null;
  hasOpenPersonLiens: boolean | null;
  inDivorce: boolean | null;
  likelyListingScore: number | null;
  /** When this record was purchased (live) or loaded (demo). Drives the 30-day no-repurchase rule. */
  purchasedAt: string;
  /** Full original API record, for audit. */
  raw?: unknown;
}

export interface Boundary {
  id: string;
  name: string;
  ring: Ring;
  createdAt: string;
}

export interface PreviewResult {
  source: DataSource;
  /** Properties in the area that pass the prefilter. */
  count: number;
  /** Already purchased in the last N days — reused, no credits. */
  alreadyHave: number;
  /** Records that would be bought on confirm (0 in demo mode). */
  credits: number;
  cap: number;
  overCap: boolean;
}

export interface SearchRecord {
  id: string;
  createdAt: string;
  source: DataSource;
  boundaryId: string;
  boundaryName: string;
  boundary: Ring;
  previewCount: number | null;
  radarIds: string[];
}

export interface CreditLogEntry {
  id: string;
  action: "preview" | "purchase_properties" | "purchase_contacts";
  records: number;
  boundaryId: string | null;
  source: DataSource;
  createdAt: string;
}

export type ReviewAction = "agree" | "override" | "eyes_on" | "teardown_confirmed" | "teardown_rejected";

export interface Review {
  id: string;
  radarId: string;
  action: ReviewAction;
  newScore: number | null;
  reason: string;
  reviewer: string;
  createdAt: string;
}

export interface ComparableSale {
  address: string;
  lat: number;
  lng: number;
  price: number;
  date: string;
}

export interface BuyBox {
  id: string;
  developer: string;
  min_lot_width_ft: number | null;
  property_types: string[];
  max_land_price_usd: number | null;
  areas: string[];
  avoid: string[];
  notes?: string;
}
