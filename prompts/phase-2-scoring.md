# Phase 2 — Scoring + AI rationale (do not start until told)

1. Score each property 0–100 from `config/scoring.json` signal weights
   (capped at 100). Deterministic, no AI.
2. For properties above a configurable threshold, call the Anthropic API
   (`ANTHROPIC_API_KEY`, server-side only) for a 2–3 sentence plain-English
   "why this could be a deal" rationale. Cache in `property_scores`.
3. Show score badge in the list, sort by score, rationale on property page.
4. Connect Supabase (`supabase/schema.sql`) once keys are provided.
