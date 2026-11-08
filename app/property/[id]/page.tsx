import Link from "next/link";
import { notFound } from "next/navigation";
import MiniMapLoader from "@/components/MiniMapLoader";
import PropertyPhoto from "@/components/PropertyPhoto";
import SignalTag from "@/components/SignalTag";
import { orderedSignals, pinColor } from "@/lib/config";
import { date, money, moneyFull, number, yearsSince } from "@/lib/format";
import { getProperty } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProperty(decodeURIComponent(id));
  if (!p) notFound();

  const signals = orderedSignals(p.signals);
  const owned = yearsSince(p.lastSaleDate);
  const facts: [string, string][] = [
    ["Type", p.propertyType],
    ["Bedrooms", number(p.beds)],
    ["Bathrooms", number(p.baths)],
    ["Size", p.sqft ? `${number(p.sqft)} sq ft` : "—"],
    ["Lot", p.lotSqft ? `${number(p.lotSqft)} sq ft` : "—"],
    ["Year built", p.yearBuilt ? String(p.yearBuilt) : "—"],
  ];
  const money_: [string, string][] = [
    ["Estimated value", moneyFull(p.estimatedValue)],
    ["Owner's equity", p.equityAmount != null ? `${moneyFull(p.equityAmount)}${p.equityPercent != null ? ` (${p.equityPercent}%)` : ""}` : "—"],
    ["Last sold", p.lastSalePrice != null ? `${money(p.lastSalePrice)} · ${date(p.lastSaleDate)}` : date(p.lastSaleDate)],
    ["Listed for sale", p.listedForSale == null ? "—" : p.listedForSale ? "Yes" : "No"],
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-4 sm:px-6">
      <Link href="/" className="mb-4 inline-flex min-h-[44px] items-center gap-1 font-semibold text-blue">
        <span aria-hidden>←</span> Back to results
      </Link>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border">
        <div className="aspect-[16/10] w-full">
          <PropertyPhoto id={p.id} address={p.address} enabled={Boolean(process.env.GOOGLE_MAPS_API_KEY)} />
        </div>
        <div className="p-5">
          <h1 className="text-2xl font-bold leading-tight">{p.address}</h1>
          <p className="text-muted">
            {[p.neighborhood, `${p.city}, ${p.state} ${p.zip}`].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-3 text-3xl font-bold">{money(p.estimatedValue)}</p>
          <p className="text-sm text-muted">estimated value</p>
        </div>
      </div>

      <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-border">
        <h2 className="mb-3 text-lg font-bold">Why it could be a deal</h2>
        {signals.length === 0 ? (
          <p className="text-muted">No motivated-seller signals on record for this property.</p>
        ) : (
          <ul className="space-y-3">
            {signals.map((s) => (
              <li key={s.id} className="flex flex-col gap-1">
                <div>
                  <SignalTag signal={s} size="md" />
                </div>
                <p className="text-sm text-muted">{s.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-border">
        <h2 className="mb-3 text-lg font-bold">Owner</h2>
        <dl className="space-y-3">
          <Fact label="Name" value={p.ownerName ?? "—"} />
          <Fact label="Mailing address" value={p.ownerMailingAddress ?? "—"} />
          <Fact label="Lives there" value={p.ownerOccupied == null ? "—" : p.ownerOccupied ? "Yes" : "No"} />
          <Fact label="Owned for" value={owned != null ? `${owned} year${owned === 1 ? "" : "s"}` : "—"} />
        </dl>
      </section>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-border">
          <h2 className="mb-3 text-lg font-bold">Money</h2>
          <dl className="space-y-3">
            {money_.map(([k, v]) => (
              <Fact key={k} label={k} value={v} />
            ))}
          </dl>
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-border">
          <h2 className="mb-3 text-lg font-bold">The building</h2>
          <dl className="space-y-3">
            {facts.map(([k, v]) => (
              <Fact key={k} label={k} value={v} />
            ))}
          </dl>
        </section>
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border">
        <div className="h-56 w-full">
          <MiniMapLoader lat={p.lat} lng={p.lng} color={pinColor(p.signals)} />
        </div>
        <div className="flex items-center justify-between gap-3 p-4">
          <span className="text-sm text-muted">{p.source === "demo" ? "Sample data (demo mode)" : "Source: PropertyRadar"}</span>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.address}, ${p.city}, ${p.state} ${p.zip}`)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[44px] items-center font-semibold text-blue"
          >
            Open in Google Maps
          </a>
        </div>
      </section>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}
