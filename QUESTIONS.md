# Follow-up questions for the client

Things I'd want answered before treating this as more than a prototype.

## About the brief

**1. Was there supposed to be a board?**
Item 3 of the brief says "The board in #3 is nice for seeing the flow, but with
500 new clients a week it becomes unusable for finding one specific person" —
but no item in the list is a board; #3 *is* the searchable list.

**2. What stages best reflect the true onboarding workflow?**
The app uses New Lead → Contacted → Verified → Booked → Active. If the process
that this practice follows is different (e.g. insurance verification happens
before first contact) the board columns and the stage dropdown will be changed
to reflect this.

**3. I removed "Paperwork Pending" as a stage. Is the rule I replaced it with right?**
The sample data had both a "Paperwork Pending" stage *and* a separate
`paperwork_complete` yes/no field, and the two could disagree. I treated
paperwork as a condition rather than a place in the funnel: the yes/no field is
the single record of it, the two clients who were in that stage became Booked
with paperwork outstanding, and the system now **refuses to mark anyone Active
until paperwork is complete**, with an explanation if it's attempted. I have a
few questions on this:

- Is that validation step correct in practice, or are there cases where someone
  is legitimately seen before every form is back (e.g. a consent signed at the
  first session)?
- Should other transitions be gated too, such as if there are verification steps
  required before a booking is made, or is Active the only one that matters?

**4. How much of the paperwork itself should live in the CRM?**
Currently the system records only *whether* paperwork is complete. The forms
themselves live wherever they live now, whether on paper or in a drive. I'm
proposing a few options, each increasing in scope, for how we should integrate
paperwork:

1. **Store the documents.** Staff upload the signed PDFs to a client's profile
   so everything about a person is in one place. Low effort. I would suggest
   that this only be a copy of intake forms that are also kept elsewhere, or if
   they are the only copy, that the practice treats these documents in
   accordance with local laws (privacy and preservation requirements).
2. **Send the forms from the CRM.** One click emails a client the intake packet,
   and the system records when it went out and which user sent it. Needs the
   email setup from question 14.
3. **E-signature.** The client signs in the browser, the signed copy lands on
   their profile, and the paperwork is automatically marked as complete. This is
   the version that removes the most manual work, but introduces additional
   issues, such as legal validity of e-signed consent in your state.

Which of these is worth having, and which forms are we talking about: intake
questionnaire, consent, HIPAA notice, financial agreement?

## About the data

**5. Is US ordering safe to assume for dates in the existing data?**
The sample CSV has five date formats. Most are unambiguous, but `04/12/1988`
could be 12 April or 4 December. I assumed US month/day/year because every area
code is NYC and every insurer is a US carrier, and I preserved the original text
of every imported row so any wrong guess is recoverable.

**6. How should duplicate client submissions be handled?**
Nothing stops the same person from filling in the intake form twice, or being
added manually after they already submitted. Should the system flag likely
duplicates, and on what? One way to consider is to flag duplicates with first
name similarity, plus having the same insurance information. One person an fill
out a form twice with two different phone numbers or emails. Conversely,
partners could share an email and ensurance, so no one field is enough. No
system is foolproof, but a good enough system can help flag potential cases.
Given that there are 500 clients weekly, it may be burdensome to have the system
fully based on manual review.

**7. How should couples and families be represented, and how do we identify them?**
The form and the database treat every submission as one person. For a couples
and family practice that's incomplete: the unit that gets booked, billed, and
seen is often a *pair*, and two individual records with no link between them
don't capture that. Two things to decide:

*What the record is.* Should there be a "case" (i.e., a couple or family) that
clients belong to, with its own stage, therapist, and notes, with individual
records in the family unit under that umbrella? Or is one person always the
primary contact and the partner an attribute of their record? If the latter,
this relates to question 6, about if and how we auto-flag potential duplicate
client submissions, if the secondary contact mistakenly submits their own forms.

*How a pair gets identified.* I'm proposing three approaches, but I think an
auto-flag with human confirmation is the best:

- **Manually.** Staff link two records when they notice. Zero burden on the
  client, zero automation, entirely dependent on someone spotting it — which is
  how it works in the spreadsheets today.
- **The client tells us on the form.** "Are you seeking couples or family
  therapy? Partner's name?" Cheap to add, and the strongest possible signal when
  it's filled in correctly. But it relies on the client understanding the
  question, getting the partner's name right, and not submitting twice to fix
  it, and on the partner's own submission agreeing.
- **An automated first pass, confirmed by a human.** The system proposes a link
  when two records share a signal, such as having the same insurance member
  ID/phone number/email address, or one record naming the other as partner, and
  staff confirm or dismiss it from the profile. **Note: This is worth answering.
  In the existing data, two records share a phone number, and are thus likely of
  the same household, but are currently being treated as if under entirely
  different onboarding processes.** This approach would always over-flag when
  two or more people of the same household are seeking individual therapy, but
  that is what human confirmation is for.

On insurance specifically: a shared member ID is a strong hint (family plans
issue one subscriber ID, sometimes with per-person suffixes) but not a
definition. Many couples are on separate plans, self-pay clients have no ID at
all, and a family plan can cover children, so "two people on one plan" is a
suggestion to confirm, not a rule that creates a dyad by itself. Something I'd
suggest is that two adults on the same insurance within 20 years of age from
each other are flagged as a "potential couple", whereas adults far apart in age
or adult/children and multi-person groupings are flagged as a "potential family
unit".

An overarching question: does the practice think in terms of cases or
individuals, and what does the front desk do *today* when two related intakes
arrive a week apart?

**8. Should client names be normalised on entry?**
The sample data has `sarah CHEN`, `Nguyen, Kevin`, `Dr. Robert Williams`. I
title-cased and reordered on import, but left the live form as-typed, since
auto-capitalising real names (`McDonald`, `van der Berg`, `DeShawn`) goes wrong
often enough that I'd rather ask. Currently, previous entries are kept in the
database through change logs and import logs, but we do not handle storing raw
entries for normalization-on-submission because that is not the current process.

**9. Any age requirements?**
The form accepts any date of birth. Is the practice adults-only, or does it
see minors? If minors: a client under 18 generally needs a parent or guardian
as the contact and consenting party, which means the form needs guardian
fields that appear based on the birth date entered, and the record needs to
distinguish the client from the person responsible for them. It also changes
the couples/family logic in question 7 — a parent and a child on one insurance
plan is a family case, not a couple. If adults-only, the form can say so and
refuse a date of birth under 18 with a clear message.

## About access

**10. What additional considerations are there to store true PHI on the site?**
This question is equal parts a client and internal consideration. If this site
houses true health records, then HIPAA applies, and neither Supabase's nor
Vercel's free tier will sign a Business Associate Agreement (Supabase offers one
on their Team plan, Vercel on Enterprise). That's a hosting-cost decision that
has to happen before any real data is entered, independent of anything in the
code. Everything in the current deployment is synthetic.

**11. Who gets a login, and what should each kind of person be allowed to do?**
The prototype has one level of access: every staff account can see and edit
every client, and **every account can also invite and remove accounts**. That's
fine for a demo and wrong for a practice: a newly hired therapist shouldn't be
able to onboard, or offboard, whoever they like. (Two guards apply regardless of
role: nobody can remove their own account, and the last remaining account can't
be removed, so the practice can never be locked out.)

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
We can also change the policy so that therapists can edit files of (their)
active clients only, while office staff handles onboarding.

**12. Should clients be assigned to a therapist?**
Nothing currently links a client to a specific therapist, and question 11's "own
caseload" row depends on that link existing. A practice doing 500 sessions a
week almost certainly has that mapping somewhere. Where does it live today, and
at what stage does a client get assigned?

**13. Sign-in method.**
Staff currently sign in with an email and password, and accounts are created by
invitation only. Does the practice already run on Google Workspace or Microsoft
365? If so, signing in with that account is both easier for staff and better for
you: when someone leaves, disabling their work account locks them out of this
system too.

## Scope beyond intake

**14. How far should email be integrated into this?**
Right now the system sends no email at all, on purpose. There's a spectrum, and,
similarly to Q4, where you want to land on it changes the build considerably:

- **Notifications only.** A confirmation to the client after they submit the
  intake form; an alert to staff when a new lead arrives; an invite email to new
  staff instead of a link passed by hand.
- **Sending things.** Staff email a client their forms, or a link, from inside
  the CRM, and the send is logged on the profile. Builds on question 4.
- **Pulling the client in.** Instead of staff re-keying details from a phone
  call, the CRM emails the client a personal link to fill in or update their own
  information, which lands directly on their record. This is the version that
  most directly attacks the "data gets re-keyed at every step" problem in the
  brief, and it means clients get a limited login of their own, which is a
  bigger security surface than staff-only access. Sending clients emails may be
  subject to secure-send requirements, since they contain sensitive information
  about being a therapy client.

Any of these needs a real sending address — something like
`intake@yourpractice.com` on a transactional email service — not the free-tier
mailer that comes with the database, which is rate-limited to a few messages an
hour and meant for development. There will be a small monthly cost plus a DNS
change.

Extra email-related question: the thank-you page currently promises contact
"within two business days". What is the current turnaround?

**15. Would we like the CRM to only manage client intake, or to also keep records for active clients?**
The brief describes the problem as getting people *booked*, and that's what's
built: the pipeline ends when someone becomes an active client. But 500 sessions
a week is an ongoing-care operation, and everything after Active currently lives
somewhere else. Whether this platform should reach into that is the biggest
scope question on the list. Some of what "managing current clients" could mean,
roughly in order of effort:

- **Appointment history on the profile.** A calendar-style view of when each
  client has been scheduled and seen. Possibly also including metrics for
  cancellation rate, etc.
- **A fuller notes log.** Currently, a client has just one text field for notes.
  A dated, attributed log, with one entry per session/admin action is a natural
  extension. For couples and families visiting the practice, joint and
  individual note logs should be considered.
- **Therapist calendars, with double-booking warnings.** Each therapist's
  schedule in the system, and a check when a slot is already taken. This can be
  integrated with the existing scheduling system, such as Google or Outlook
  calendars.
- **Automated appointment reminders.** A no-reply email (or text) the daybefore,
  with what's needed for the visit. Builds on question 14 (and the note on
  integrating with third-party calendars above. Still has a consideration about
  securely sending sensitive therapy information via email.
- **A booking tool.** Staff — or eventually clients themselves — book sessions
  directly in the CRM. This is the point where the system becomes the practice's
  scheduling system of record, which is a much bigger commitment than a CRM.

I'd want to know two things: which of these, if any, is the goal, and what the
practice uses for scheduling *today* — because if that tool is working,
integrating with it may beat rebuilding it.

**16. Retention.**
Should records for people who never became clients be kept indefinitely, or
purged after some period? That's both a privacy and a "clutter removal"
question. And if this site will eventually manage active clients, the same
question applies for client mental health records, where the retention rules are
stricter and set by state law.
