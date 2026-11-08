# Build notes

What was built against this kit, what runs differently until keys arrive, and
what still needs confirming. CLAUDE.md and config/scoring.json still win.

## Status
| Phase | Status |
|---|---|
| 1 — Data | Built and verified in demo mode. Live PropertyRadar path written, untested (no key). Supabase auth/storage waits on keys. |
| 2 — Scoring + card | Built and verified in demo mode. 31 unit tests (`npm test`). Claude features verified to fall back cleanly without a key. |
| 3 — Contacts | Not started. |

## Until keys are added
- **Demo mode** (no `PROPERTY_RADAR_API_KEY`): 25 sample Bucktown / Wicker Park parcels in `data/demo-properties.json`, all fields from `docs/field-map.md`, covering every enabled signal. 3 fail the prefilter on purpose (condos, under $700K). `data/demo-sales.json` feeds nearby high sales; `data/demo-seed.json` pre-confirms 2 teardowns. Adding the key switches to live data automatically.
- **Storage**: `lib/store.ts` writes a local JSON file (`data/local/`, gitignored) with the same tables as `supabase/schema.sql`. Swap to Supabase once keys are given.
- **No sign-in yet**: Supabase magic-link auth and the admin profile come with the Supabase keys. Until then reviews are recorded as "Team member" and Settings is open to anyone running the app.
- **Claude** (no `ANTHROPIC_API_KEY`): one-line reasons use the automatic line built from the scoring engine (same format); the teardown "Ask Claude" button is disabled and a person decides directly.
- **Google** (no `GOOGLE_MAPS_API_KEY`): street and aerial views show placeholders.

## Additions to config/scoring.json
Values the kit stated in prose, made machine-readable (no new rules):
- `credits.repurchase_after_days: 30`, `credits.max_records_per_pull: 250` (safety cap).
- `long_ownership.params.years_min: 15`.
- `nearby_high_sale.params`: 0.25 mi, 24 months, $1,500,000.

## How rules are enforced in code
- Excluded fields: `lib/propertyradar.ts` refuses to request them (checked at startup); `lib/scoring.ts` refuses to evaluate them; a unit test checks config never uses them.
- Owner age: off in config; Settings shows it locked and the API ignores attempts to switch it on.
- Divorce: scored as a flag, never in the one-line reason and never sent to Claude.
- Credits: preview with `Purchase=0` → confirm sheet shows already-saved (free), new, and credit cost → purchase only new RadarIDs; every preview and pull goes to the credit log (Settings).
- Secrets: all keys read in server code only; `npm run check:secrets` builds with marked fake keys and scans the browser bundle (passes).

## PropertyRadar items still to confirm (need the key / API reference)
1. Latitude / longitude field names (assumed `Latitude`, `Longitude`).
2. Last sale fields (assumed `LastTransferRecDate`, `LastTransferValue`).
3. Whether `Purchase=0` returns RadarIDs (needed to skip records bought in the last 30 days *before* buying). If it doesn't, the app buys the area capped at 250 and can re-buy cached records.
4. Whether `RadarID` is accepted as a search criterion (to buy only the new records).
5. How `inDistress` comes back in results (list vs. comma string) and whether cancelled listings are separate from `isExpiredListing`.
6. Comparable sales / transactions endpoint for nearby high sales (live cards say "Not checked yet").
7. Property persons and phone purchase paths (Phase 3).
8. Rate limits.
Run `/api/propertyradar/explore` once the key is in: it makes one free `Purchase=0` call and shows the raw response.

## Other confirms
- Cook County Clerk deep link by PIN: the card opens the Clerk's recordings search and copies the PIN to paste. Swap in a direct link once the URL format is confirmed.

## Decisions for Antwan / Joe
- **Call List is crowded in old neighborhoods.** "Built 75+ years ago" (+2) is true for most Bucktown / Wicker Park houses, so old + owned 15 yrs + high equity = 6 reaches the Call List with no distress at all. In the demo, 13 of 18 land on the Call List and 7 hit the 10 cap. Options: make old building medium (+1), raise the threshold to 7, or let the calibration set decide.
- **$1M+ project tag** uses land value (AVM) alone. A construction-cost estimate would make it meaningful for $700K–$1M lots.
- Pilot boundary, buy boxes, equity threshold, calibration addresses (still open in the kit).
