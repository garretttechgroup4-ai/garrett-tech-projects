# CLAUDE.md — Super Agent Deal Finder rulebook

Super Agent Deal Finder (formerly "Real View") is an owner-first, off-market
property finder for Prashanth. You draw an area on a map, the app pulls every
property inside it from PropertyRadar, flags motivated-seller signals, and
(later) scores and drafts outreach — always behind a human review gate.

Follow these rules on every step.

## Product rules

1. **Grandmother-simple.** One obvious next action on every screen. Plain
   English labels ("Owner lives out of state", not `isOutOfStateOwner`). No
   jargon, no dense tables on phones.
2. **Light theme only.** White / slate-50 backgrounds, slate text, one blue
   accent. Never a dark theme, never dark map tiles.
3. **Phone first.** Every screen must work at 375px wide with thumbs: tap
   targets ≥ 44px, no hover-only actions, no horizontal scroll.
4. **Never spend money silently.** Any action that can use PropertyRadar
   records (or any paid API) shows a preview count and asks for confirmation
   first. Respect `search.maxResultsPerSearch` in `config/scoring.json`.
5. **Human review gate.** Nothing is ever sent to an owner without a person
   approving it. (Phase 3.)

## Engineering rules

1. **Secrets live only in the environment.** `.env.local` locally, Vercel
   project settings in production. Never in code, commits, logs, or chat.
   `.env.example` lists every key with an empty value.
2. **Demo mode must always work.** If `PROPERTYRADAR_API` is missing, the app
   runs on `data/demo-properties.json` with no other change in behaviour.
   When the key is present it switches to live data automatically.
3. **Config, not code.** Signals, labels, weights and search limits live in
   `config/scoring.json`. Code reads them; it never hard-codes a signal list.
4. **One normalized `Property` shape.** Every data source (demo, PropertyRadar,
   later Cityscape) is mapped into `lib/types.ts#Property` in one place
   (`lib/sources/*`). The field map in `docs/field-map.md` is the source of
   truth; anything marked **confirm** must be verified against the live API
   before it is trusted.
5. **Storage behind one interface.** `lib/store.ts` — local JSON file until
   Supabase keys are provided, then Supabase using `supabase/schema.sql`.
   Do not connect to Supabase until the keys are given.
6. **Server-side keys.** Paid / secret API calls happen in route handlers only.
   Google Maps imagery is proxied through `/api/streetview` so the key never
   reaches the browser.
7. **Phases are gates.** Build only the phase you were asked for
   (`prompts/phase-N-*.md`). Do not start the next phase until told.
8. **Verify before reporting done.** Run the app, click through the real flow
   (draw → preview → confirm → list → property), and say exactly what was and
   was not verified.
9. **Commits.** Small, descriptive commits. Never commit `.env*` (except
   `.env.example`) or `data/local/`.

## Stack

Next.js (App Router, TypeScript) · Tailwind · Leaflet (CARTO light tiles, no
key needed) · PropertyRadar API · Supabase (Postgres) · Anthropic API
(Phase 2) · Google Maps Street View Static API · Vercel.
