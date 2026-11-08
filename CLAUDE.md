# Super Agent — Deal Finder (Phase 1)

You are building the Deal Finder for Super Agent: an internal tool that turns Chicago parcel data from PropertyRadar into a daily ranked call list of off-market owners for a realtor (Joe) and a small team of researchers.

The owner of this project (Antwan) directs the build by voice and does not write code. Explain decisions in plain English, keep the app simple enough that someone non-technical can use it on day one, and finish each phase fully before starting the next.

## Stack
- Next.js (App Router, TypeScript) on Vercel
- Supabase: Postgres + PostGIS, Auth, Row Level Security on every table
- PropertyRadar REST API (base URL `https://api.propertyradar.com/v1`, Bearer token)
- Anthropic API (Claude) for scoring explanations, teardown review, and call prep
- Map: Mapbox GL or Leaflet with a light basemap

## Design rules
- Light theme only. White and soft-gray backgrounds, one accent color, generous spacing. Never dark mode.
- Apple-level simplicity: one primary action per screen, plain-English labels, no jargon, no filter overload.
- Mobile-friendly: Joe works from his phone in the field.
- Every score shows its reasons. Every missing field says "Not found" or "Last updated [date]". Never guess.

## Non-negotiable rules
1. **Secrets stay on the server.** `PROPERTY_RADAR_API_KEY`, `ANTHROPIC_API_KEY`, and the Supabase service key are only read in server code (route handlers, server actions, cron jobs). Never expose them to the browser, never commit them, never log them.
2. **Protect PropertyRadar credits.** Every property pulled with `Purchase=1` costs an export. Always preview counts first with `Purchase=0`, request only the fields in `docs/field-map.md`, cache every record in Supabase, and never re-purchase a record pulled in the last 30 days. Show the expected credit cost before any bulk pull and require a click to confirm.
3. **Never use protected or demographic fields** in filtering, scoring, or display: Ethnicity, Gender, MaritalStatus, PresenceOfChildren, ChildAge, AdultChildrenAtHome, Language, Interests, Giving, Religion, Education, Income, Networth, OccupationGroup, BirthMonth. Do not request them from the API. The list lives in `config/scoring.json > excluded_fields`; enforce it in code.
4. **Owner age is a review-gated signal.** It exists in config with `requires_legal_review: true`. It stays switched off until the admin turns it on after attorney review.
5. **No automated outreach.** The app never places calls, plays AI or prerecorded voices, or sends bulk texts. It prepares the call list, talking points, and text templates; a person dials and sends each message. Scrub every number against Do Not Call and show DNC and litigator flags prominently.
6. **Seller protection.** Relatives are contacted only to reach the owner. Log every call and outcome. Never show a "go around the owner" workflow.
7. **PropertyRadar terms.** Their API is licensed for end-user use. This tool is internal to the Super Agent team. Do not build features that resell or expose PropertyRadar data to outside users without a partner agreement.

## Project layout
```
/app                    Next.js routes (dashboard, map, list, property/[id], review, settings)
/lib/propertyradar.ts   Typed API client (server only)
/lib/scoring.ts         Pure scoring engine driven by config/scoring.json
/lib/claude.ts          Claude calls (explanations, teardown review, call prep)
/config/scoring.json    Joe's criteria, weights, thresholds, buy boxes
/supabase/schema.sql    Database schema
/docs/field-map.md      Property card field -> PropertyRadar field
```

## How scoring works
- Signals, points, and thresholds come only from `config/scoring.json`. No weights hard-coded anywhere else.
- Score = sum of points of matched signals, clamped to 1–10.
- Score >= `thresholds.call_list` goes to the Call List. Below that goes to the Review List, where a person confirms or overrides with a reason. Overrides are stored and reported so weights can be tuned.
- An "eyes-on" flag set by a team member puts a property on the Call List regardless of score.
- Buy boxes (one per developer) are matched separately and shown as tags ("Fits: Developer A, Developer C").

## Definition of done for every phase
- Works end-to-end with real PropertyRadar data inside the pilot boundary.
- Credit usage logged per pull.
- No secrets in client bundles (verify with a build check).
- A plain-English summary of what was built, what was tested, and anything that needs Antwan's decision.
