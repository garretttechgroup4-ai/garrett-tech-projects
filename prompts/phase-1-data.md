# Phase 1 — Data (weeks 1–2)

Paste into Claude Code from the project folder.

---

Read CLAUDE.md, config/scoring.json, supabase/schema.sql, and docs/field-map.md before writing code.

Build Phase 1 of the Deal Finder:

1. Set up a Next.js (App Router, TypeScript) project with Supabase auth (email magic link). Light theme only.
2. Apply supabase/schema.sql. Seed one admin profile for Antwan.
3. Build `lib/propertyradar.ts`, a server-only typed client for `POST /v1/properties`:
   - Accepts a Criteria array; always calls with `Purchase=0` first to get a count.
   - Requests only the fields listed in docs/field-map.md. Reject any field in `excluded_fields`.
   - Before you write the field list, open the PropertyRadar API Reference and resolve every item marked **confirm** in docs/field-map.md. Update the doc with the real names.
   - Handles paging and rate limits; logs every call to `credit_log`.
4. Map screen: draw a boundary polygon, name it, save it to `boundaries`.
5. "Find properties" button: combines the boundary polygon with `prefilter.pr_criteria` from config, shows the preview count and credit cost, and purchases only after a confirm click. Skip any `radar_id` already purchased in the last 30 days. Save results to `properties` (keep the full response in `raw`).
6. List screen: address, value, equity %, years owned, year built, estimated lot width. Sortable. Tapping a row opens a basic property page.

Done when: I can draw a boundary in Bucktown, see the count and cost, confirm, and see real properties on the map and in the list, with credits logged. Give me a plain-English summary and anything you need me to decide.
