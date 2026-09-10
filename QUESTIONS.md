# Follow-up questions for the client

Things I'd want answered before treating this as more than a prototype. For each,
I've noted the assumption I built on so nothing is silently blocking.

## About the brief

**1. Was there supposed to be a board?**
Item 3 of the brief says "The board in #3 is nice for seeing the flow, but with 500
new clients a week it becomes unusable for finding one specific person" — but no
item in the list is a board; #3 *is* the searchable list. I read that as a
pipeline (kanban) view that was cut from an earlier draft, and built one at
`/board` since the stage data supports it directly. Is that what you had in
mind, or should it go?

**2. Are the stages the real workflow, in that order?**
The app uses New Lead → Contacted → Verified → Booked → Active. If the
practice's actual funnel differs — e.g. insurance verification happens before
first contact — the board columns and the stage dropdown should follow it.

**3. I removed "Paperwork Pending" as a stage. Is the rule I replaced it with right?**
The sample data had both a "Paperwork Pending" stage *and* a separate
`paperwork_complete` yes/no field, and the two could disagree. I treated
paperwork as a condition rather than a place in the funnel: the yes/no field is
the single record of it, the two clients who were in that stage became Booked
with paperwork outstanding, and the system now **refuses to mark anyone Active
until paperwork is complete** — with a message saying why. Two things I'd
confirm:

- Is that gate correct in practice, or are there cases where someone is
  legitimately seen before every form is back (e.g. a consent signed at the
  first session)?
- Should other transitions be gated too — say, Booked requiring Verified — or
  is Active the only one that matters?

**4. How much of the paperwork itself should live in the CRM?**
Today the system records only *whether* paperwork is complete — a checkbox.
The forms themselves live wherever they live now. There's a range of how far
to bring them in, each step a real increase in scope:

1. **Store the documents.** Staff upload the signed PDFs to a client's profile
   so everything about a person is in one place. Low effort; mostly a
   question of where files are kept and who can open them.
2. **Send the forms from the CRM.** One click emails a client the intake
   packet, and the system records when it went out. Needs the email setup
   from question 13.
3. **E-signature.** The client signs in the browser, the signed copy lands on
   their profile, and the paperwork flag flips itself. This is the version
   that removes the most manual work — and the one with the most moving parts
   (a signature provider, legal validity of e-signed consent in your state,
   and definitely a BAA, per question 9).

Which of these is worth having, and which forms are we talking about —
intake questionnaire, consent, HIPAA notice, financial agreement?

## About the data

**5. Is there a canonical source for dates, and is US ordering safe?**
The sample CSV has five date formats. Most are unambiguous, but `04/12/1988`
could be 12 April or 4 December. I assumed US month/day/year because every
area code is NYC and every insurer is a US carrier, and I preserved the
original text of every imported row so any wrong guess is recoverable. Where
does this data actually originate — the website form, a spreadsheet someone
types into, both?

**6. How should duplicate submissions be handled?**
Nothing stops the same person from filling in the intake form twice, or being
added manually after they already submitted. Should the system flag likely
duplicates, and on what — email, phone, name + date of birth? Or is that a
judgment call staff make when they see two similar rows?

**7. How should couples and families be represented, and how do we identify them?**
The form and the database treat every submission as one person. For a couples
and family practice that's incomplete: the unit that gets booked, billed, and
seen is often a *pair*, and two individual records with no link between them
don't capture that. Two things to decide.

*What the record is.* Should there be a "case" — a couple or family — that
clients belong to, with its own stage, therapist, and notes, alongside the
individual records? Or is one person always the primary contact and the
partner an attribute of their record?

*How a pair gets identified.* Three approaches, and I'd argue for the last:

- **Manually.** Staff link two records when they notice. Zero burden on the
  client, zero automation, entirely dependent on someone spotting it — which is
  how it works in the spreadsheets today.
- **The client tells us on the form.** "Are you seeking couples or family
  therapy? Partner's name?" Cheap to add, and the strongest possible signal
  when it's filled in correctly. But it relies on the client understanding the
  question, getting the partner's name right, and not submitting twice to fix
  it — and on the partner's own submission agreeing.
- **An automated first pass, confirmed by a human.** The system proposes a link
  when two records share a signal — the same insurance subscriber/member ID, a
  shared phone or email, or one record naming the other as partner — and staff
  confirm or dismiss it from the profile. The form's partner-name question
  becomes one input among several rather than the whole mechanism.

On insurance specifically: a shared member ID is a strong hint (family plans
issue one subscriber ID, sometimes with per-person suffixes) but not a
definition. Many couples are on separate plans, self-pay clients have no ID at
all, and a family plan can cover children — so "two people on one plan" is a
suggestion to confirm, not a rule that creates a dyad by itself.

What I'd want from you: does the practice think in terms of cases or
individuals, and what does the front desk do *today* when two related intakes
arrive a week apart?

**8. Should client names be normalised on entry?**
The sample data has `sarah CHEN`, `Nguyen, Kevin`, `Dr. Robert Williams`. I
title-cased and reordered on import, but left the live form as-typed, since
auto-capitalising real names (`McDonald`, `van der Berg`, `DeShawn`) goes
wrong often enough that I'd rather ask.

## About access

**9. Prototype, or on a path to real client records?**
If real: these are health records, HIPAA applies, and neither Supabase's nor
Vercel's free tier will sign a Business Associate Agreement (Supabase offers
one on their Team plan, Vercel on Enterprise). That's a hosting-cost decision
that has to happen before any real data is entered, independent of anything
in the code. Everything in the current deployment is synthetic.

**10. Who gets a login, and what should each kind of person be allowed to do?**
The prototype has one level of access: every staff account can see and edit
every client, and — this is the part I'd fix first — every account can also
invite new accounts. That's fine for a demo and wrong for a practice: a newly
hired therapist shouldn't be able to onboard whoever they like.

I'd guess the real shape is something like:

| Role | Clients | Team |
|---|---|---|
| Practice owner / manager | see and edit everything | invite and remove anyone, change roles |
| Office / intake staff | see and edit everything | invite new hires |
| Therapist | see (and maybe edit) their own caseload; possibly read-only on others | no |

Is that close? In particular: who is allowed to create accounts, and is there
anyone who should see client records but not be able to change them? The
database already enforces access with row-level policies, so this is a policy
change rather than a rewrite — but I need the actual roles before writing them.

**11. Should clients be assigned to a therapist?**
Nothing currently links a client to a specific therapist, and question 10's
"own caseload" row depends on that link existing. A practice doing 500
sessions a week almost certainly has that mapping somewhere. Where does it
live today, and at what stage does a client get assigned?

**12. Sign-in method.**
Staff currently sign in with an email and password, and accounts are created
by invitation only — public signup is disabled. Does the practice already run
on Google Workspace or Microsoft 365? If so, signing in with that account is
both easier for staff and better for you: when someone leaves, disabling their
work account locks them out of this system too.

## Scope beyond intake

**13. How far should email be integrated into this?**
Right now the system sends no email at all, on purpose. There's a spectrum,
and where you want to land on it changes the build considerably:

- **Notifications only.** A confirmation to the client after they submit the
  intake form; an alert to staff when a new lead arrives; an invite email to
  new staff instead of a link passed by hand. Modest scope.
- **Sending things.** Staff email a client their forms, or a link, from inside
  the CRM, and the send is logged on the profile. Builds on question 4.
- **Pulling the client in.** Instead of staff re-keying details from a phone
  call, the CRM emails the client a personal link to fill in or update their
  own information — contact details, insurance, the intake questionnaire —
  which lands directly on their record. This is the version that most directly
  attacks the "data gets re-keyed at every step" problem in the brief, and it
  means clients get a limited login of their own, which is a bigger security
  surface than staff-only access.

Any of these needs a real sending address — something like
`intake@yourpractice.com` on a transactional email service — not the free-tier
mailer that comes with the database, which is rate-limited to a few messages an
hour and meant for development. Small monthly cost plus a DNS change.

Two things I'd want settled before building any of it: which tier above is the
goal, and whether it's acceptable for an email to confirm that someone contacted
a therapy practice, given who else might see their inbox. (The thank-you page
currently promises contact "within two business days" — what's the real
commitment?)

**14. Does the system stop at "Active," or manage clients from there on?**
The brief describes the problem as getting people *booked*, and that's what's
built: the pipeline ends when someone becomes an active client. But 500
sessions a week is an ongoing-care operation, and everything after Active
currently lives somewhere else. Whether this platform should reach into that
is the biggest scope question on the list. Some of what "managing current
clients" could mean, roughly in order of effort:

- **Appointment history on the profile.** A calendar-style view of when each
  client has been seen. Read-only if appointments are entered by hand; more
  useful if they come from the scheduling system.
- **A fuller notes log.** Today a client has one free-text notes field. A
  dated, attributed log — one entry per call, session, or admin action, with
  who wrote it — is what most practices actually want, and it's the natural
  extension of the stage history that already exists.
- **Therapist calendars, with double-booking warnings.** Each therapist's
  schedule in the system, and a check when a slot is already taken.
- **Automated appointment reminders.** A no-reply email (or text) the day
  before, with what's needed for the visit. Builds on question 13, and has
  the same "who else sees their inbox" consideration.
- **A booking tool.** Staff — or eventually clients themselves — book sessions
  directly in the CRM. This is the point where the system becomes the
  practice's scheduling system of record, which is a much bigger commitment
  than a CRM.

I'd want to know two things: which of these, if any, is the goal, and what
the practice uses for scheduling *today* — because if that tool is working,
integrating with it may beat rebuilding it.

**15. Retention.**
Should records for people who never became clients — leads that went nowhere —
be kept indefinitely, or purged after some period? That's both a privacy and a
"500 a week adds up" question. And if the answer to question 14 is "yes, manage
ongoing care too," the same question applies to clinical notes, where the
retention rules are stricter and set by state law rather than preference.
