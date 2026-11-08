# Phase 2 — Scoring and property card (weeks 3–4)

---

Read CLAUDE.md and config/scoring.json again. Build Phase 2:

1. `lib/scoring.ts`: a pure function that takes a property record and config and returns `{score, matched_signals[], list}`.
   - Points per tier come from `points`; score = sum, clamped 1–10.
   - Skip signals where `enabled` is false. Never use `excluded_fields`.
   - Write unit tests: one property per signal, plus edge cases (no data, all signals, eyes-on override).
2. After each pull, score every property and write a row to `scores` with the config version.
3. Claude writes a one-line plain-English reason per score ("8 — code violations, owns 3 properties, 62% equity"). Store it in `scores.summary`.
4. Property card (`/property/[id]`), everything visible on open:
   - Score and reasons at the top, buy-box tags ("Fits: Developer A"), $1M+ project tag.
   - Value, equity, loans (including reverse mortgage), last sale, years owned, properties owned, vacancy, violations, liens, out-of-state.
   - Live street view and aerial (Google Maps embed), not stored.
   - "Open Cook County recordings" link using the PIN.
   - Missing fields say "Not found".
5. Teardown review: a button asks Claude to judge the street image ("likely teardown / renovate / newer build" + why). A person confirms or rejects; save to `reviews`.
6. Nearby high sales: pull comparables within 0.25 mi sold in the last 24 months above $1.5M (values from config). Show them on the card and feed the `nearby_high_sale` signal.
7. Two lists:
   - **Call List:** score >= `thresholds.call_list`, plus eyes-on flags. Sorted by score.
   - **Review List:** everything else, with Agree / Override (requires a reason) / Eyes-on buttons.
8. Settings (admin only): edit buy boxes; toggle signals; show which signals get overridden most.

Done when: the pilot boundary produces a scored Call List, each card explains its score, and an override is saved with a reason.
