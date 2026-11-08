# Super Agent — Deal Finder build kit

Joe's prospecting criteria, turned into instructions Claude Code can build from.

## What's in here
| File | What it is |
| --- | --- |
| `START-HERE.md` | The prompt to paste into Claude Code first |
| `docs/project-context.md` | Everything decided in the meetings: vision, Joe's process, scoring, legal gates |
| `CLAUDE.md` | Project rules Claude Code reads automatically: stack, design, safety, credits |
| `config/scoring.json` | Joe's criteria as PropertyRadar search criteria, weights, thresholds, buy boxes |
| `supabase/schema.sql` | Database tables with security turned on |
| `docs/field-map.md` | Every property card field and where it comes from |
| `prompts/phase-1-data.md` | Prompt 1: boundary, PropertyRadar pull, list |
| `prompts/phase-2-scoring.md` | Prompt 2: 1–10 score, property card, audit list |
| `prompts/phase-3-contacts.md` | Prompt 3: owners + relatives, ranked numbers, call logging |

## How Joe's process maps
| Joe today | Deal Finder |
| --- | --- |
| PropStream filters | `config/scoring.json` signals, run on PropertyRadar |
| Google Earth | Live street and aerial view on the card |
| Cook County Clerk by PIN | One-click link from the card |
| Forewarn / TruePeopleSearch | PropertyRadar owner + relative contacts, with DNC and litigator flags |
| Call, voicemail, text | Call screen, outcome logging, one-tap drafted follow-up text |

## Before you start
1. Create a GitHub repo, a Vercel project, and a Supabase project.
2. Put these in Vercel and in `.env.local` (never in chat or in code): `PROPERTY_RADAR_API_KEY`, `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, plus the public Supabase URL and anon key.
3. Copy this folder into the repo root.
4. Run the three prompts in order. Don't start the next until the current one meets its "Done when".

## Fill in before Phase 1 ships
- **Pilot boundary** — `market.pilot_boundary` in scoring.json (or just draw it in the app).
- **Buy boxes** — one per developer under `buy_boxes.developers`.
- **Equity threshold** — 50% is a placeholder; Joe to confirm.
- **Calibration set** — 10–20 known good and bad addresses (closed deals, 1626 N Wood, 2039 N Hoyne) to check the scores against.

## Open legal items (attorney)
- Owner age signal (off by default).
- Text-message follow-ups and calling scripts (TCPA / DNC).
- PropertyRadar's API is for end users. Fine for this internal tool; showing their data to investors or selling access later needs their partner program.
