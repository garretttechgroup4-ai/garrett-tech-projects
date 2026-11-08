# Phase 1 — Data: map, area search, property list

Goal: Prashanth can draw an area on a map, see how many properties are inside
before anything is bought, confirm, and browse the results — on a phone.

## Build
1. **Map** (Leaflet, light CARTO tiles, centered on Bucktown / Wicker Park).
2. **Boundary drawing** — "Draw area" → tap points on the map → "Done".
   Undo and Clear while drawing. Quick-pick chips for saved neighborhoods.
3. **"Find properties"** → calls `/api/search/preview` → shows the count
   ("23 properties in this area") and whether records will be used.
   Second tap ("Show them") calls `/api/search/run`. Warn and cap at
   `search.maxResultsPerSearch`.
4. **Property list** — address, type, beds/baths, estimated value, signal
   tags (plain-English labels from `config/scoring.json`). Sorted by most
   signals. Tapping a row highlights its pin; tapping a pin scrolls the list.
5. **Property page** `/property/[id]` — Street View photo (via
   `/api/streetview`, placeholder without a key), facts, owner, every signal
   with its description, small map, back button.
6. **Data sources** — `lib/sources/demo.ts` (no key) and
   `lib/sources/propertyradar.ts` (key present), picked automatically.
   Visible "Demo mode" banner when on demo data.
7. **Storage** — `lib/store.ts`; local JSON file in `data/local/` until
   Supabase keys exist. Last search reloads when the app reopens.
8. **API check** — keep `/api/propertyradar/explore` to inspect the raw
   live response and fix `docs/field-map.md`.

## Done when
- Demo mode: draw → preview → confirm → list → property works on desktop and
  at 375px wide.
- `npm run build` passes. No keys in the repo.
