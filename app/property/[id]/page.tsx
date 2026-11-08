import Link from "next/link";
import { notFound } from "next/navigation";
import MiniMapLoader from "@/components/MiniMapLoader";
import PropertyImagery from "@/components/PropertyImagery";
import RecordingsLink from "@/components/RecordingsLink";
import ReviewPanel from "@/components/ReviewPanel";
import ScoreBadge from "@/components/ScoreBadge";
import TeardownPanel from "@/components/TeardownPanel";
import { card, CALL_COLOR, REVIEW_COLOR } from "@/components/ui";
import { anthropicKey } from "@/lib/claude";
import { date, money, moneyFull, NF, number, orNF, typeLabel, yesNo } from "@/lib/format";
import { mapsKey } from "@/lib/googlemaps";
import { scoreAll } from "@/lib/scored";
import { CONFIG } from "@/lib/scoring";
import { getProperty, getTeardownAI, reviewsFor } from "@/lib/store";

export const dynamic = "force-dynamic";

const DISTRESS_LABEL: Record<string, string> = {
  isExpiredListing: "Expired or cancelled listing",
  isCodeEnforcement: "Code enforcement",
  isDeceasedProperty: "Owner deceased",
  inProbateProperty: "In probate",
  isDeceasedJointTenant: "Joint owner deceased",
  isOutOfStateOwner: "Out-of-state owner",
};

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await getProperty(decodeURIComponent(id));
  if (!raw) notFound();
  const [[item], history, ai] = await Promise.all([scoreAll([raw]), reviewsFor(raw.radarId), getTeardownAI(raw.radarId)]);
  const { property: p, score } = item;

  const lastTeardown = history.filter((h) => h.action === "teardown_confirmed" || h.action === "teardown_rejected").at(-1);
  const flags = p.distressFlags.filter((f) => DISTRESS_LABEL[f]).map((f) => DISTRESS_LABEL[f]);
  const reverseMortgage = /reverse/i.test(p.firstLoan?.purpose ?? "");
  const outOfState = p.distressFlags.includes("isOutOfStateOwner") ? `Yes${p.ownerMailingState ? ` (${p.ownerMailingState})` : ""}` : p.ownerMailingState ? "No" : NF;

  const moneyRows: [string, string][] = [
    ["Estimated value", moneyFull(p.estimatedValue).replace("—", NF)],
    ["Equity", p.equityPercent != null ? `${p.equityPercent}%${p.equityAmount != null ? ` · ${moneyFull(p.equityAmount)}` : ""}` : NF],
    ["Open loans", p.openLoans != null ? `${p.openLoans}${p.totalLoanBalance ? ` · ${moneyFull(p.totalLoanBalance)} owed` : ""}` : NF],
    ["First loan", p.firstLoan ? [date(p.firstLoan.date), p.firstLoan.amount != null ? money(p.firstLoan.amount) : null, p.firstLoan.purpose].filter(Boolean).join(" · ") : NF],
    ["Last sale", p.lastSaleDate ? `${date(p.lastSaleDate)}${p.lastSalePrice != null ? ` · ${money(p.lastSalePrice)}` : ""}` : NF],
    ["Years owned", orNF(item.yearsOwned)],
  ];
  const ownerRows: [string, string][] = [
    ["Properties owned", orNF(p.propertiesOwned)],
    ["Out of state", outOfState],
    ["Vacant (USPS)", yesNo(p.vacant)],
    ["Code violations", p.distressFlags.includes("isCodeEnforcement") ? "Yes" : "None on record"],
    ["Liens", p.hasOpenLiens || p.hasOpenPersonLiens ? "Open liens" : p.hasOpenLiens === null && p.hasOpenPersonLiens === null ? NF : "None open"],
    ["Likely-to-list score", orNF(p.likelyListingScore)],
  ];
  const buildingRows: [string, string][] = [
    ["Type", `${typeLabel(p.propertyType)}${p.units ? ` · ${p.units} unit${p.units > 1 ? "s" : ""}` : ""}`],
    ["Year built", p.yearBuilt ? `${p.yearBuilt}` : NF],
    ["Building size", p.sqft ? `${number(p.sqft)} sq ft` : NF],
    ["Lot size", p.lotSqft ? `${number(p.lotSqft)} sq ft` : NF],
    ["Lot width", item.lotWidth != null ? `~${item.lotWidth} ft (estimated)` : NF],
    ["Cook County PIN", orNF(p.apn)],
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-4 sm:px-6">
      <Link href="/" className="mb-4 inline-flex min-h-[44px] items-center gap-1 font-semibold text-blue">
        <span aria-hidden>←</span> Back to list
      </Link>

      {/* Score and reasons first */}
      <section className={card}>
        <div className="flex items-start gap-4">
          <ScoreBadge score={score.score} list={score.list} size="lg" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight">{p.address}</h1>
            <p className="text-muted">{[p.neighborhood, `${p.city}, ${p.state} ${p.zip ?? ""}`].filter(Boolean).join(" · ")}</p>
            <p className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">
              {score.list === "call" ? "On the Call List" : "On the Review List"}
              {score.eyesOn && " · Eyes on"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {item.fits.length > 0 ? (
            <Tag tone="blue">Fits: {item.fits.join(", ")}</Tag>
          ) : (
            <Tag tone="grey">No buy box match{" "}<Link href="/settings" className="underline">set up buy boxes</Link></Tag>
          )}
          {item.projectOk === true && <Tag tone="blue">$1M+ project</Tag>}
          {item.projectOk === false && <Tag tone="grey">Under $1M on land value</Tag>}
          {p.inDivorce && <Tag tone="grey">Divorce filing — flag only, never mention</Tag>}
        </div>

        <h2 className="mb-2 mt-5 text-sm font-bold uppercase tracking-wide text-muted">Why it scores {score.score}</h2>
        {score.overridden && (
          <p className="mb-2 text-sm">
            The team changed this from <strong>{score.baseScore}</strong> to <strong>{score.score}</strong>.
          </p>
        )}
        {score.matched.length === 0 ? (
          <p className="text-muted">No signals found in the data.</p>
        ) : (
          <ul className="divide-y divide-border">
            {score.matched.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <div className="font-semibold">{m.label}</div>
                  <div className="text-sm text-muted">{m.evidence}</div>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-bold">+{m.points}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted">
          Top signals +{CONFIG.points.top}, high +{CONFIG.points.high}, medium +{CONFIG.points.medium}. Score {CONFIG.thresholds.call_list}+ goes to the Call List.
        </p>
      </section>

      <section className={`${card} mt-5`}>
        <h2 className="mb-3 text-lg font-bold">Your call</h2>
        <ReviewPanel radarId={p.radarId} list={score.list} score={score.score} eyesOn={score.eyesOn} history={history} />
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border">
        <PropertyImagery id={p.radarId} address={p.address} enabled={Boolean(mapsKey())} />
        <div className="p-5">
          <h2 className="mb-3 text-lg font-bold">Teardown check</h2>
          <TeardownPanel
            radarId={p.radarId}
            canAsk={Boolean(mapsKey() && anthropicKey())}
            ai={ai}
            decision={
              lastTeardown
                ? {
                    confirmed: lastTeardown.action === "teardown_confirmed",
                    reason: lastTeardown.reason,
                    when: new Date(lastTeardown.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  }
                : null
            }
          />
        </div>
      </section>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Facts title="Money" rows={moneyRows} highlight={reverseMortgage ? "First loan is a reverse mortgage" : undefined} />
        <Facts title="Owner & status" rows={ownerRows} />
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Facts title="The building" rows={buildingRows} />
        <section className={card}>
          <h2 className="mb-3 text-lg font-bold">Nearby high sales</h2>
          {item.nearbySales === null ? (
            <p className="text-muted">Not checked yet — needs PropertyRadar sales data (being confirmed).</p>
          ) : item.nearbySales.length === 0 ? (
            <p className="text-muted">None over $1.5M within ¼ mile in the last 2 years.</p>
          ) : (
            <ul className="space-y-2">
              {item.nearbySales.map((s) => (
                <li key={s.address + s.date} className="flex justify-between gap-3">
                  <span>
                    <span className="font-semibold">{s.address}</span>
                    <span className="block text-sm text-muted">
                      {date(s.date)} · {s.miles.toFixed(2)} mi away
                    </span>
                  </span>
                  <span className="font-bold">{money(s.price)}</span>
                </li>
              ))}
            </ul>
          )}
          {flags.length > 0 && (
            <>
              <h3 className="mb-1 mt-4 text-sm font-bold uppercase tracking-wide text-muted">PropertyRadar flags</h3>
              <p className="text-sm">{flags.join(" · ")}</p>
            </>
          )}
        </section>
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border">
        <div className="h-56 w-full">
          <MiniMapLoader lat={p.lat} lng={p.lng} color={score.list === "call" ? CALL_COLOR : REVIEW_COLOR} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <RecordingsLink pin={p.apn} />
          <span className="text-sm text-muted">
            {p.source === "demo" ? "Sample data (demo mode)" : `PropertyRadar · last updated ${date(p.purchasedAt)}`}
          </span>
        </div>
      </section>
    </main>
  );
}

function Tag({ tone, children }: { tone: "blue" | "grey"; children: React.ReactNode }) {
  const cls = tone === "blue" ? "bg-blue-light text-blue-dark ring-blue/20" : "bg-slate-50 text-ink ring-border";
  return <span className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${cls}`}>{children}</span>;
}

function Facts({ title, rows, highlight }: { title: string; rows: [string, string][]; highlight?: string }) {
  return (
    <section className={card}>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {highlight && <p className="mb-3 rounded-xl bg-amber-50 p-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">{highlight}</p>}
      <dl className="space-y-3">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0">
            <dt className="text-sm text-muted">{k}</dt>
            <dd className={`text-right font-semibold ${v === NF ? "text-muted" : ""}`}>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
