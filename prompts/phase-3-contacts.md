# Phase 3 — Contacts and call workflow (weeks 5–6)

---

Read CLAUDE.md again, especially rules 5 and 6. Build Phase 3:

1. For Call List properties only, fetch owners and up to `contacts.relatives_per_property` relatives from PropertyRadar's property-persons data, with age and role. Show the credit cost and require a confirm click before buying phones.
2. Save to `persons` and `phones` with line type, status, DNC, and litigator flags.
3. Rank phones by `contacts.rank_phones_by`. Hide numbers matching `contacts.never_contact_if` behind a "Do not call" label. The top number shows as "Call this number".
4. Call screen (mobile-first):
   - Owner first, relatives below, labeled "Relative — use only to reach the owner".
   - Talking points from Claude: plain-English, respectful, built from the property's signals. Never mention divorce, death, liens, or age to the person.
   - A tap-to-dial link (the person dials on their own phone).
   - Outcome buttons: No answer, Left voicemail, Spoke, Interested, Not interested, Call back, Wrong number, Do not contact. Notes and follow-up date.
5. Follow-up text: Claude drafts a short personalized text from a template; the person reviews and sends it from their own phone with one tap (`sms:` link). No bulk sending, no sending from the server.
6. Daily view: "Today's 4" — the top uncontacted Call List properties plus follow-ups due today.
7. Seller-protection notice on any property where the owner record shows age 70+ or a power of attorney: "Recommend the owner's own attorney reviews any offer."

Done when: Joe opens "Today's 4" on his phone, sees the best number for each owner, logs a call, and gets a drafted follow-up text — with every action in `call_logs`.
