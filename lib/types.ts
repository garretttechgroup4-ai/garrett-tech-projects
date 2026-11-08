export interface CriteriaProfile {
  clientName: string;
  zones: string[];
  propertyTypes: string[];
  priceMin: number;
  priceMax: number;
  minEquityPercent: number;
  plates: string[];
  notes: string;
  updatedAt: string;
}

export const PROPERTYRADAR_PLATES = [
  "Pre-Foreclosure",
  "Vacant",
  "Absentee Owner",
  "Divorce",
  "Tax Delinquent",
  "High Equity",
  "Probate",
] as const;

/** [lng, lat] pairs, GeoJSON order. First point is NOT repeated at the end. */
export type Ring = [number, number][];

export type DataSource = "demo" | "live";

/** The one normalized property shape. See docs/field-map.md. */
export interface Property {
  id: string;
  source: DataSource;
  address: string;
  city: string;
  state: string;
  zip: string;
  neighborhood?: string;
  lat: number;
  lng: number;
  propertyType: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lotSqft: number | null;
  yearBuilt: number | null;
  estimatedValue: number | null;
  equityAmount: number | null;
  equityPercent: number | null;
  lastSaleDate: string | null;
  lastSalePrice: number | null;
  ownerName: string | null;
  ownerMailingAddress: string | null;
  ownerMailingState: string | null;
  ownerOccupied: boolean | null;
  listedForSale: boolean | null;
  signals: string[];
  raw?: unknown;
}

export interface PreviewResult {
  source: DataSource;
  count: number;
  /** Records that would be purchased if confirmed (0 in demo mode). */
  recordsToUse: number;
  cap: number;
  overCap: boolean;
  /** True when count is a bounding-box estimate, not the exact shape. */
  approximate: boolean;
}

export interface SearchRecord {
  id: string;
  createdAt: string;
  source: DataSource;
  boundary: Ring;
  previewCount: number | null;
  propertyIds: string[];
}
