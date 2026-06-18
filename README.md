# Boom SOS — Highlands

Internal manager prototype for BoomBozz corporate stores.

**Highlands** — BoomBozz Pizza & Watch Bar · 1448 Bardstown Rd

One mobile-first manager page that answers, in 5 seconds:
**what do I do, who do I call, who do I escalate to, and did this get logged?**

## Run it

It's a static page — no build step.

```bash
# from the repo root
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just open `index.html` directly in a browser.

## What's in here

| File | What it is |
|------|------------|
| `index.html` | Page shell + tabs |
| `styles.css` | Mobile-first styling (big buttons, phone-first) |
| `app.js` | All behavior — flows, search, Ask Boom, incident log |
| `data.js` | **All store-specific content lives here** |

## The page

- **Home** — quick-hit emergency cards. Tap one → structured flow (do this now → risk check → call now → one-tap actions → log it).
- **Vendors** — searchable, store-specific vendor directory by category, with primary/backup/after-hours and approved status.
- **Playbooks** — "what do I do," not just "who do I call." Each answers: first move / what not to do / who approves / when to escalate / how to log.
- **Ask Boom** — concierge. Every answer comes back in the same tight order: do this now → call → escalate if → log → related playbook.
- **Log** — incident log saved in the browser (`localStorage`). Views: open / today / this week / repeat issues. Filters: equipment / utilities / staffing / guest / vendor / unresolved. Resolve, reopen, escalate inline.
- **Escalate** — the Highlands ladder (GM → John → Judy → Enzo) and red-level examples.

## Highlands data still to fill in

Everything store-specific is in **`data.js`**. Placeholders are wrapped in `[ ]`
or shown as `(xxx) xxx-xxxx`. Fill in:

- GM name + cell, and John / Judy / Enzo cells (`CONTACTS`)
- Approved + backup vendor list, after-hours contacts (`VENDORS`)
- Emergency spend / comp / refund limits (`PLAYBOOKS`)
- Store-specific quirks and known recurring issues

## Notes

- The incident log is stored locally in the manager's browser. A shared
  backend (so logs roll up across managers/stores) is the natural next step.
- Ask Boom is rule-based keyword matching today — intentionally no
  "AI assistant" language, just tight ops answers.
