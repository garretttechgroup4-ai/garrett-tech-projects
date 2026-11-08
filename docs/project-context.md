# Super Agent — Project context

Everything decided in the planning conversations (Oct 28 meeting with Prashanth and Joe; Joe's criteria, Oct 29). Read this for the "why". Where anything here conflicts with CLAUDE.md or config/scoring.json, those files win.

Source document: Super Agent — Platform Architecture (Claude Doc, rev 26).

## The vision
Super Agent turns raw Chicago parcel data into about 4 call-ready deals a day, then packages each deal with preselected vendors and sells it to investors for a development fee.

- **Today:** sourcing is à la carte. Joe works lists by hand against 5–6 developers' criteria, lands about 5 deals in 4 months, and earns a one-time commission. Once land goes to a developer, control is gone.
- **Target:** one system controls the deal from first call to sellout. Income shifts from commissions to development fees (about 2% of project cost) plus vendor participation fees.
- **Proof:** 4 deals locked in the past year: Lakewood (4 units, $7.3M sellout), Cornelia (2 units, $4M+), Hermitage, State Street / Palmer Square.
- **Start slow:** 2–3 projects, one targeted street boundary, then expand.

## Three layers (build in this order)
1. **Deal Finder** — this build. Boundary → PropertyRadar data → 1–10 score → owner and relative contacts → daily call list.
2. **Deal Room (back end, vendors)** — one room per signed deal. Stages: Sourced → Under contract → Designed → Budgeted → Funded → Permitted → Built → Sold. Preselected seats: attorney (closing docs), architect (drawings), GC (budget, draws), broker (comps, sellout), lender later. Vendors are selected, not bidding; they pay a flat platform fee or give a discounted rate. E-signature inside the room.
3. **Investor portal (front end)** — three steps from the whiteboard: Deal details → Sign agreements → Check updates. Plain English for people outside real estate.

Two exit paths per deal: **system deal** (investor uses our vendors; development fee + vendor fees) or **outside sale** (sell the packaged deal to a developer for a flat fee).

## Project and investor rules
- Projects must be **$1M+ land plus construction**. A $300K deal takes the same time as a $3M one.
- Chicago first: **North Side lots** and **large South Side lots** (big enough for multiple units).
- **Investors must be outside real estate.** Industry people join only as vendors.
- Investor tiers: single investors around $150K into a $1M+ deal; high-net-worth and corporations $5M+ into spec and whole-street plays.

## Joe's prospecting process (what the app replaces)
| Joe today | In the app |
| --- | --- |
| PropStream filters: equity, years owned, year built, last recorded sale, 1+ open mortgages, owns 2+ properties, value over $700K, cancelled or expired listing | Same criteria from PropertyRadar, scored 1–10 (config/scoring.json) |
| Google Earth to eyeball the property | Live street and aerial view on the property card, plus AI teardown flag |
| Cook County Clerk recordings by PIN | One-click link from the card using the PIN |
| Forewarn for phone numbers | PropertyRadar owner + relative contacts with line type, status, DNC, litigator flags |
| Call, voicemail, follow-up text | "Today's 4" call screen, outcome logging, drafted follow-up text sent from his own phone |

Joe also wants to text many owners at once. A blast to cold numbers needs prior written consent, so the app drafts each text and the person sends it with one tap.

## Scoring decisions
- Every property gets a 1–10 score with reasons. **6+ goes to the Call List**; under 6 goes to a Review List where a person confirms a 5 is a true 5 (overrides tune the weights).
- The score shows as the first column on every list with a one-line reason; the full reasoning sits on the property card.
- **Top signals:** structural defects or code violations; owner 70+ (off until attorney review); failed listing; teardown look.
- **High:** high equity / little debt; owned 15+ years; built 75+ years ago; owner holds 2+ properties (has somewhere to go, so an easier move); vacant; nearby high sale.
- **Medium:** open mortgage; death, estate, or intra-family transfer; liens or litigation; out-of-state owner; divorce (flag only, never searched for or mentioned).
- **Eyes-on flag:** a team member who saw the property in person can push it to the Call List.
- One owner holding several nearby parcels (example: 1610 and 1612 N Wood plus 1635 and 1639 N Paulina) is a strong lead: one call can open several deals.
- Missing or stale data shows "Not found" or "Last updated [date]". Some manual work is expected.

## Data decisions
- **PropertyRadar only for v1.** API access is confirmed. Cityscape comes later, after a session with its data lead to pick only the endpoints needed; its filters are redundant and confused earlier agent attempts.
- **PropStream has no public API** — manual CSV export only, for cross-checks.
- **TruePeopleSearch has no API and scraping breaks its terms** — use PropertyRadar's contact data.
- The app requests only the fields on the property card, so redundant filters never reach the user or the agent. Goal: Apple-simple, not Samsung.

## Contacts and seller protection
- For each Call List property: owner plus up to 4 relatives with ages, every number checked for mobile vs. landline, working status, DNC, and litigator flags; the best mobile is ranked "Call this number."
- Relatives exist to reach the owner (a tech-savvy family member or the person with power of attorney) — never to go around the owner.
- The AI prepares and ranks; **a person always dials and sends**. AI-voiced calls and automated texts need prior consent.
- Older sellers are told in writing to have their own attorney review any offer. Realistic timelines, no 45-day pressure. Every call is logged.
- This is the brand: the team has lived what predatory outreach to seniors costs a family. Super Agent is the trustworthy caller.

## Phases
1. Deal Finder (about 6 weeks: data, scoring, contacts) — this kit.
2. Deal Room for live deals (Lakewood, Cornelia, Hermitage) with real vendors, no investors.
3. Vendor onboarding (applications, vetting, agreements, platform fee). Rebuild the Base44 onboarding here.
4. Investor portal — only after an attorney sets up the offering structure.
5. Scale: more boundaries, buy boxes, whole-street spec packages, lender seat; a team of 5 commission-based researchers.
6. Education and national: license the platform and mentorship model to university real estate programs.

## Legal gates (attorney before launch of each)
- Investor offering (Reg D; 506(c) for marketing to accredited investors, 506(b) invite-only for others).
- Vendor fees: flat platform fee, not a per-deal referral cut (Illinois rules).
- Calling and texting scripts (TCPA, Do Not Call).
- Owner-age signal (Illinois age protections).
- PropertyRadar's API is for end users: fine for this internal tool; showing their data to investors or selling access needs their partner program.

## Still open
- Pilot street boundary.
- Buy boxes for each of the 5–6 developers.
- Joe's equity threshold (50% placeholder).
- 10–20 known good and bad addresses to calibrate scores (closed deals, 1626 N Wood, 2039 N Hoyne).
- Development fee %, vendor fee level, researcher commission.
- What D1–D4 on the whiteboard mean (four live deals or four stages).
