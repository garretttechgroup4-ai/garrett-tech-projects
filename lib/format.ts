export const money = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  return `$${Math.round(n / 1000)}K`;
};

export const moneyFull = (n: number | null | undefined) => (n == null ? "—" : `$${n.toLocaleString("en-US")}`);

export const number = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-US"));

export function date(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function yearsSince(s: string | null | undefined) {
  if (!s) return null;
  const y = (Date.now() - new Date(s).getTime()) / (365.25 * 24 * 3600 * 1000);
  return isNaN(y) ? null : Math.floor(y);
}

export function bedsBaths(beds: number | null, baths: number | null) {
  const parts: string[] = [];
  if (beds != null) parts.push(`${beds} bd`);
  if (baths != null) parts.push(`${baths} ba`);
  return parts.join(" · ");
}

/** "Not found" for anything missing — never guess (CLAUDE.md design rules). */
export const NF = "Not found";
export const orNF = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? NF : String(v));

const TYPE_LABEL: Record<string, string> = { SFR: "House", MFR: "2–4 flat", LND: "Land", CND: "Condo", MOB: "Mobile home", COM: "Commercial" };
export const typeLabel = (t: string | null) => (t ? TYPE_LABEL[t] ?? t : NF);

export const yesNo = (v: boolean | null | undefined) => (v === null || v === undefined ? NF : v ? "Yes" : "No");
