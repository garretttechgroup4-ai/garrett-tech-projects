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
