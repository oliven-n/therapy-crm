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

**2. Are the six stages the real workflow, in that order?**
The sample data uses New Lead → Contacted → Verified → Booked → Paperwork
Pending → Active. I kept those exactly, in that order. If the practice's actual
funnel differs — e.g. insurance verification happens before first contact — the
board columns and the stage dropdown should follow it.

**3. `paperwork_complete` and the "Paperwork Pending" stage overlap.**
A client can be in the Paperwork Pending stage with `paperwork_complete = true`
(the sample data has no such case, but nothing prevents it). Is one of these
redundant, or do they mean different things — say, one for the intake packet
and one for insurance forms?

## About the data

**4. Is there a canonical source for dates, and is US ordering safe?**
The sample CSV has five date formats. Most are unambiguous, but `04/12/1988`
could be 12 April or 4 December. I assumed US month/day/year because every
area code is NYC and every insurer is a US carrier, and I preserved the
original text of every imported row so any wrong guess is recoverable. Where
does this data actually originate — the website form, a spreadsheet someone
types into, both?

**5. How should duplicate submissions be handled?**
Nothing stops the same person from filling in the intake form twice, or being
added manually after they already submitted. Should the system flag likely
duplicates, and on what — email, phone, name + date of birth? Or is that a
judgment call staff make when they see two similar rows?

**6. Should client names be normalised on entry?**
The sample data has `sarah CHEN`, `Nguyen, Kevin`, `Dr. Robert Williams`. I
title-cased and reordered on import, but left the live form as-typed, since
auto-capitalising real names (`McDonald`, `van der Berg`, `DeShawn`) goes
wrong often enough that I'd rather ask.

## About access

**7. Prototype, or on a path to real client records?**
If real: these are health records, HIPAA applies, and neither Supabase's nor
Vercel's free tier will sign a Business Associate Agreement (Supabase offers
one on their Team plan, Vercel on Enterprise). That's a hosting-cost decision
that has to happen before any real data is entered, independent of anything
in the code. Everything in the current deployment is synthetic.

**8. Who gets a login, and what should each kind of person be allowed to do?**
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

**9. Should clients be assigned to a therapist?**
Nothing currently links a client to a specific therapist, and question 8's
"own caseload" row depends on that link existing. A practice doing 500
sessions a week almost certainly has that mapping somewhere. Where does it
live today, and at what stage does a client get assigned?

**10. Sign-in method.**
Staff currently sign in with an email and password, and accounts are created
by invitation only — public signup is disabled. Does the practice already run
on Google Workspace or Microsoft 365? If so, signing in with that account is
both easier for staff and better for you: when someone leaves, disabling their
work account locks them out of this system too.

## Smaller things

**11. What should the intake form promise?**
The thank-you page currently says someone will be in touch "within two
business days." What's the real commitment, and should the form also send the
client a confirmation email?

**12. Retention.**
Should records for people who never became clients — leads that went nowhere —
be kept indefinitely, or purged after some period? That's both a privacy and a
"500 a week adds up" question.
