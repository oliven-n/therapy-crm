# Therapy Practice CRM

**Live:** https://therapy-crm-rho.vercel.app — public intake at `/intake`, staff sign-in at `/login`.
**Follow-up questions for the client:** [QUESTIONS.md](QUESTIONS.md)

A prototype CRM for a couples and family therapy practice: a public intake form,
a searchable client list, per-client profiles, and a stage pipeline — replacing a
manual chain of re-keying form submissions between spreadsheets.

Built with Next.js (App Router), Supabase (Postgres + Auth), and Vercel.

## ⚠️ Prototype — synthetic data only

This is a build exercise, not a production system.

- Every record is **fabricated**. The client data comes from a supplied dummy CSV;
  the phone numbers are all in the `555-01xx` range reserved for fiction.
- **Not HIPAA-eligible as deployed.** Real client records would be PHI, and
  neither Supabase's nor Vercel's free tier will sign a Business Associate
  Agreement — Supabase offers one on Team, Vercel on Enterprise. Signed BAAs from
  both would be a prerequisite before any real patient data touched this stack,
  independent of anything in the application code.
- No real data should be entered into any deployment of this repository.

## Architecture

```
Browser
   │
   ▼
Next.js on Vercel ──── Server Components read the database directly
   │                   Server Actions handle every write
   ▼
Supabase (PostgREST) ── verifies the caller, applies RLS
   │
   ▼
Postgres ────────────── clients table
```

Two deliberate choices worth naming:

**The public intake form never touches the database directly.** It posts to a
server action that validates the input and inserts using the service role key,
server-side. Anonymous visitors therefore need *no* database privileges at all,
which means RLS can be authenticated-only. The alternative — granting `anon` an
INSERT policy — is harder to fence in correctly, since a careless policy that
permits writes can easily also permit reading every other client's record.

**Access control is two independent locks.** The Supabase project is configured
with *automatically expose new tables* off, so the migration grants table
privileges explicitly — and grants `anon` none. An anonymous caller is refused at
the SQL permission layer before RLS is consulted, so a mistake in a policy still
cannot leak client records. RLS is the second lock, not the only one.

**Stage changes are recorded by the database, not the app.** A trigger on
`clients` appends to `client_stage_history` whenever the stage changes, with a
timestamp and the acting staff member's id and email from `auth.uid()`. That
works because staff writes go through the user's own session rather than the
service key — the attribution is a direct payoff of that earlier decision.
Writes from the intake form or the CSV import run as `service_role` and are
recorded with no user, which is accurate. The app holds no insert grant on the
history table; the trigger is its only writer. A second trigger does the same
for every other field — `client_field_history` holds one row per changed
field per edit, with the previous and new values — so a renamed client, a
corrected phone number, or an edited note is never silently lost. The profile
page shows both as one timeline.

**Concurrent edits can't silently overwrite each other.** The profile form
carries the `updated_at` it was rendered from, and the save applies only if the
row still has that value. Whoever saves second is told to reload rather than
having their stale copy of every field win.

**Search and filters live in the URL**, not in React state. `?stage=Booked&q=<term>`
re-runs the server component with new query parameters, so filtering happens in
Postgres rather than by shipping every row to the browser. Results stay
bookmarkable and the back button works.

## Setup

Requires Node 20+.

```bash
npm install
```

Create a Supabase project, then copy the example env file and fill it in from
**Project Settings → API Keys**:

```bash
cp .env.example .env.local
```

Apply the schema by pasting `supabase/migrations/20260910131500_init_clients.sql`
into the Supabase SQL Editor and running it.

Load the dummy data:

```bash
npm run seed:dry   # parse and print, write nothing
npm run seed       # actually insert
```

Close public signup. In the Supabase dashboard, **Authentication → Sign In /
Providers → Email**, turn **off** *Allow new users to sign up*. Without this,
anyone holding the publishable key can call the signup endpoint, become
`authenticated`, and read every client record. The app has no signup page, but
the API endpoint exists regardless.

Start the app and create the first staff account:

```bash
npm run dev
npm run invite -- you@example.com
```

The invite script prints a one-time link. Open it, choose a password, and you're
in. Every account after that is created from the **Team** page inside the app,
the same way: a signed-in staff member enters a colleague's email and gets a
link to send them. Accounts are never created through the Supabase dashboard.

(For a deployed instance, prefix the command with the live URL so the link
points there: `SITE_URL=https://your-app.vercel.app npm run invite -- you@example.com`.)

## Deploying

Vercel imports the GitHub repo directly. The only configuration is the same
three environment variables from `.env.example`, entered under
**Project Settings → Environment Variables**. Every push to `main` redeploys;
pushes to other branches get their own preview URL.

## Data normalization

The supplied CSV is deliberately messy, and the seed script handles each problem
explicitly rather than silently coercing:

| Problem in source | Handling |
|---|---|
| 5 date formats (`1990-07-03`, `04/12/1988`, `7/9/92`, `March 15 1985`, `12-Mar-1979`) | Parsed to `DATE`. Slash dates read as US month/day/year. |
| 2-digit years | Pivot at 30 — `92` → 1992, `25` → 2025 |
| 7 spellings of yes/no (`no`, `Y`, `TRUE`, `yes`, `N`, `y`, `YES`) | `BOOLEAN` |
| Inconsistent name casing, and one name in `Last, First` order | Title-cased, preserving apostrophes and honorifics; reversed names flipped |
| **An unquoted comma inside a name field**, producing a 12-field row that shifts every later value right by one | Detected, name fields rejoined, columns realigned |
| Notes containing commas and an embedded newline | Handled by a real CSV parser |
| Mixed phone formats | Stored E.164, formatted for display |
| Uppercase emails | Lowercased |

Every original row is preserved untouched in `clients.raw_import` (JSONB), so
each decision above is auditable and reversible. `npm run seed:dry` prints a
report of every ambiguous value it encountered.

The one assumption that cannot be resolved from the data: **`04/12/1988` could be
12 April or 4 December.** US ordering is assumed because every area code in the
file is NYC and every insurer is a US carrier. Flagged as a question for the
client.

## Status

- [x] Schema, RLS policies, indexes
- [x] CSV normalization and seed script
- [x] Auth (Supabase email/password, session refresh in `proxy.ts`)
- [x] Staff onboarding by invite link from the Team page; public signup closed
- [x] Public intake form
- [x] Client list with search and filters
- [x] Client profile and editing
- [x] Stage pipeline board
- [x] Stage history with staff attribution; optimistic concurrency on edits
- [x] Field-level change history: every edit records old value, new value, when, who
- [x] Deployed to Vercel
