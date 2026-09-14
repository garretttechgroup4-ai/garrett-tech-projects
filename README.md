# Off-Market Deal Engine — Prashanth

An owner-first off-market property pipeline. Prashanth supplies PropertyRadar
API access and his buy-box criteria; this platform pulls properties by plate
(Vacant, Absentee Owner, Divorce, etc.), scores every match against his
criteria, writes a rationale for why it qualifies, and holds everything at a
human review gate before any outreach goes out. Chicago Cityscape bolts on
later as an intelligence layer (owner lookup, permits, development pressure).

This replaces the previous Deal Scout project in this repo — unrelated, and
archived under `legacy-deal-scout/`.

## Architecture

- **Criteria Profile** (`data/criteria-profile.json`, edited at `/criteria`) —
  Prashanth's rules: zones, property types, price range, minimum equity, and
  which PropertyRadar plates to pull from.
- **PropertyRadar engine** (`lib/propertyradar.ts`) — server-side API client.
  The key (`PROPERTYRADAR_API`) lives only in the environment, never in code
  or chat.
- **Filter / scoring engine** (Phase 2-3, not yet built) — filters
  PropertyRadar results through the Criteria Profile, scores each property
  0-100, and writes a rationale for the match.
- **Review gate** (Phase 4, not yet built) — nothing drafts or sends to an
  owner without a human approving it first.
- **Cityscape layer** (Phase 5, not yet built) — owner lookup, pending
  permits, development pressure, once `CITYSCAPE_API` is added.
- **Dashboard** (this Next.js app, deployed to Vercel) — Phase 6.

## Build sequence

| Phase | Scope | Status |
|---|---|---|
| 0 | Foundation — project scaffold, Criteria Profile model, API client | Done |
| 1 | API exploration — learn every field PropertyRadar returns before building on it | Scaffolded, needs `PROPERTYRADAR_API` |
| 2 | Filter engine | Not started |
| 3 | Scoring + rationale | Not started |
| 4 | Review gate + outreach drafts | Not started |
| 5 | Cityscape integration | Not started |
| 6 | Dashboard on Vercel | In progress (this app) |

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in PROPERTYRADAR_API
npm run dev
```

Open `/` for the build status dashboard and Phase 1 API exploration runner,
or `/criteria` to edit Prashanth's Criteria Profile.

## What's still needed to move past Phase 1

1. **PropertyRadar API key** — set as `PROPERTYRADAR_API` in Vercel project
   settings (or `.env.local` for dev). Never paste it into chat or commit it.
2. **Prashanth's real criteria** — zones, property types, price range, equity
   requirements — to replace the placeholder values in `data/criteria-profile.json`.
3. **Confirm PropertyRadar's actual endpoint paths and field names** against
   their official API docs — `lib/propertyradar.ts` is written generically on
   purpose so Phase 1's exploration run (not assumption) defines the real
   data dictionary before the filter/scoring engine gets built on it.
