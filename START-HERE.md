# Start here — paste this into Claude Code

Open this folder in Claude Code (Claude desktop app → Code → Local → Open folder… → super-agent-build-kit), then paste everything below the line.

---

You are building Super Agent's Deal Finder from the build kit in this folder.

First, read every file in this folder: CLAUDE.md, README.md, docs/project-context.md, config/scoring.json, supabase/schema.sql, docs/field-map.md, and the three files in /prompts. CLAUDE.md is the rulebook; docs/project-context.md explains the why. Follow CLAUDE.md on every step.

Then build Phase 1 exactly as written in prompts/phase-1-data.md, with one change: I have not entered any API keys yet. So:

1. Create the Next.js (App Router, TypeScript) project in this folder, keeping the kit files where they are. Initialize git and commit the starting point.
2. Create a .env.example listing every key the app will need (PropertyRadar, Anthropic, Supabase URL, anon key, service role key, Google Maps). Never put real keys in code or commits. Add .env.local to .gitignore.
3. Build a "demo mode" that runs when the PropertyRadar key is missing. Use a fake data file of about 25 Chicago properties in Bucktown and Wicker Park that cover every signal in config/scoring.json, so I can click through the whole app before connecting anything. When the real key is added, the app switches to live data automatically.
4. Keep supabase/schema.sql as a migration ready to run, but do not connect to Supabase until I give you the keys. Until then, store demo data locally.
5. Build the map with boundary drawing, the "Find properties" button with the preview-count and confirm step, and the property list. Light theme only, simple enough for anyone, and it must work on a phone.
6. Run the app locally and check it yourself: draw a boundary, run a search in demo mode, and open a property.

When you finish, tell me in plain English:
- What you built and how I open it.
- Exactly what I need to sign up for and which keys to paste where, step by step.
- Anything in docs/field-map.md marked "confirm" that you still need to verify against the live PropertyRadar API.

Do not start Phase 2 until I say so.
