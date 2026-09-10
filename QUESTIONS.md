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

**8. Who needs what level of access?**
Right now every staff account can see and edit every client. Do you need
distinctions — front desk vs. therapists vs. practice manager? Read-only
roles? The database already enforces access with row-level policies, so adding
roles is a policy change rather than an application rewrite, but I'd want to
know the actual roles first.

**9. Should clients be assigned to a therapist?**
Nothing currently links a client to a specific therapist. A practice doing 500
sessions a week almost certainly has that mapping somewhere. If it belongs in
the CRM, the natural follow-up is whether a therapist should see only their own
caseload — which is the same policy mechanism as question 8.

**10. How should new staff get accounts?**
I built invite-only: an existing staff member generates a one-time link from
inside the app, and public signup is disabled. Is that the right model, or do
you have an existing identity provider (Google Workspace, Microsoft 365) that
staff should sign in with instead?

## Smaller things

**11. What should the intake form promise?**
The thank-you page currently says someone will be in touch "within two
business days." What's the real commitment, and should the form also send the
client a confirmation email?

**12. Retention.**
Should records for people who never became clients — leads that went nowhere —
be kept indefinitely, or purged after some period? That's both a privacy and a
"500 a week adds up" question.
