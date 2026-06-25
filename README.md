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
| `auth.js` | Email magic-link sign-in (gates the log only) |
| `store.js` | Incident storage + Supabase sync (offline-first) |
| `config.js` | Backend URL + publishable key |

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

## Backend (incident log)

The incident log is backed by **Supabase** (Postgres), so entries roll up
across every manager and, later, across stores.

- **Offline-first.** `localStorage` is always the working copy, so the log
  keeps working when the internet is down — which is one of the emergencies
  this tool exists for. Changes are marked dirty and pushed to Supabase when
  the connection returns. The Log tab shows a live sync status.
- **Where it lives.** Table `public.boom_sos_incidents` in the
  `staybook-guidebook` Supabase project (co-located to stay within the free
  tier; namespaced so it's cleanly separated). Swapping to a dedicated project
  later is just a `config.js` change.
- **Config.** `config.js` holds the project URL and the **publishable** key.
  That key is meant to be public — access is governed by row-level security
  and sign-in, not by hiding it.

## Auth (who can use the log)

The emergency reference content (cards, vendors, playbooks, Ask Boom) is
**open — never behind a login**. You should never have to sign in to read
"shut off the gas." Only the shared **incident log** requires sign-in.

- **Email magic link.** A manager enters their work email and gets a one-tap
  sign-in link — no password. Sessions persist, so it's a one-time step, and
  the log keeps working offline afterward.
- **Manager allowlist.** Only emails in `public.boom_sos_managers` can read or
  write the log. Signing in with an email that isn't on the list authenticates
  but shows "not authorized" — no access to the data.
- **RLS.** Every incident operation requires an authenticated, allowlisted
  manager. **Deletes are blocked** so history can't be wiped from the client.

### One-time Supabase dashboard setup

Two settings can't be done from code — do them once in the Supabase dashboard
for the `staybook-guidebook` project:

1. **Auth → Providers → Email:** make sure Email is enabled (magic link works
   out of the box; no password needed).
2. **Auth → URL Configuration:** set the **Site URL** to wherever you host the
   page, and add it (plus `http://localhost:8000` for local testing) to the
   **Redirect URLs** allowlist. The magic-link email returns the manager here.

> Supabase's built-in email has low rate limits and may land in spam. For real
> rollout, configure SMTP under Auth → Emails.

### Adding / removing managers

Until there's an admin UI, manage the allowlist in the Supabase SQL editor:

```sql
-- add a manager
insert into public.boom_sos_managers (email, name, store, role)
values ('manager@boombozz.com', 'First Last', 'Highlands', 'manager');

-- revoke access (keeps their history intact)
update public.boom_sos_managers set active = false
where email = 'manager@boombozz.com';
```

`javenzo1@gmail.com` is seeded as the initial admin so you can sign in
immediately.

## Notes

- Ask Boom is rule-based keyword matching today — intentionally no
  "AI assistant" language, just tight ops answers.
