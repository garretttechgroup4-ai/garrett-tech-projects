# Phase 2 — Scoring + AI rationale

1. Score each property 0–100 from `config/scoring.json` signal weights
   (capped at 100). Deterministic, no AI.
2. For properties above a configurable threshold, call the Anthropic API
   (`ANTHROPIC_API_KEY`, server-side only) for a 2–3 sentence plain-English
   "why this could be a deal" rationale. Cache in `property_scores`.
3. Show score badge in the list, sort by score, rationale on property page.
4. Connect Supabase (`supabase/schema.sql`) once keys are provided.

## Status
Built. Bands and the AI threshold live in `config/scoring.json` (`scoring`).
AI write-ups use Claude Opus 5.5 at low effort, generated only when a
qualifying property is opened, cached per property + signals + config
version. Without `ANTHROPIC_API_KEY` a plain automatic summary is shown.
Supabase connection is still pending keys (step 4).
