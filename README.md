# Therapy Practice CRM

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

Then:

```bash
npm run dev
```

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
- [ ] Auth
- [ ] Public intake form
- [ ] Client list with search and filters
- [ ] Client profile and editing
- [ ] Stage pipeline board
- [ ] Deployed to Vercel
