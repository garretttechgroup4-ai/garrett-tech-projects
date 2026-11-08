# Super Agent Deal Finder

Owner-first off-market property finder for Prashanth (formerly "Real View").
Draw an area on the map → see how many properties are inside → confirm →
browse every property with plain-English motivated-seller signals.

Rules for building on this live in [`CLAUDE.md`](CLAUDE.md).

## Run it

```bash
npm install
cp .env.example .env.local   # optional — leave empty for demo mode
npm run dev                  # open http://localhost:3000
```

With no keys the app runs in **demo mode**: 25 sample properties in Bucktown
and Wicker Park covering every signal in `config/scoring.json`. Add
`PROPERTYRADAR_API` to `.env.local` (or Vercel) and restart — it switches to
live data automatically.

## Where things live

| Path | What |
|---|---|
| `CLAUDE.md` | Rulebook |
| `config/scoring.json` | Signals, plain-English labels, weights, search cap |
| `docs/field-map.md` | PropertyRadar → app field mapping (items marked **confirm**) |
| `supabase/schema.sql` | Database migration (run once Supabase is set up) |
| `prompts/phase-*.md` | Phase specs |
| `data/demo-properties.json` | Demo data |
| `lib/sources/` | Demo + PropertyRadar data sources, auto-selected |
| `lib/store.ts` | Storage (local file today, Supabase later) |
| `app/page.tsx` | Map, drawing, search, list |
| `app/property/[id]` | Property page |
| `app/criteria` | Buy box (criteria profile) |
| `/api/propertyradar/explore` | Live API check for confirming the field map |

## Phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Data: map, area search with preview + confirm, list, property page, demo mode | Done (demo verified; live needs key) |
| 2 | Scoring + AI rationale, Supabase | Not started |
| 3 | Review gate + outreach drafts | Not started |
| Later | Chicago Cityscape layer | Not started |

`legacy-deal-scout/` is an unrelated earlier project kept for reference.
