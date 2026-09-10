'use server'

/**
 * Every write in the app goes through one of these Server Actions.
 *
 * Server Actions are reachable by direct POST, not only through the UI, so
 * each staff action calls requireUser() itself rather than trusting that the
 * page it lives on was behind the login redirect.
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { STAGES, type Stage } from '@/lib/types'
import { cleanText, normalizeEmail, normalizePhone } from '@/lib/normalize'

export type FormState = {
  error?: string
  fieldErrors?: Record<string, string>
  saved?: boolean
  /** inviteStaff only: the one-time link for the new account. */
  link?: string
} | null

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

function field(fd: FormData, name: string): string {
  return String(fd.get(name) ?? '')
}

function revalidateClientViews(id?: string) {
  revalidatePath('/clients')
  revalidatePath('/board')
  if (id) revalidatePath(`/clients/${id}`)
}

/** What a prospective client tells us. Shared by the public intake and staff forms. */
function parseContactFields(fd: FormData) {
  const fieldErrors: Record<string, string> = {}

  const client_name = cleanText(field(fd, 'client_name'))
  if (!client_name) fieldErrors.client_name = 'Name is required.'

  const email = normalizeEmail(field(fd, 'email'))
  if (email && !EMAIL_RE.test(email)) fieldErrors.email = 'Enter a valid email address.'

  const rawPhone = field(fd, 'phone').trim()
  const phone = normalizePhone(rawPhone)
  if (rawPhone && !phone) fieldErrors.phone = 'Enter a 10-digit US phone number.'

  const date_of_birth = field(fd, 'date_of_birth').trim() || null
  if (date_of_birth && !ISO_DATE_RE.test(date_of_birth)) {
    fieldErrors.date_of_birth = 'Enter a valid date.'
  }

  return {
    fieldErrors,
    values: {
      client_name: client_name ?? '',
      email,
      phone,
      date_of_birth,
      insurance: cleanText(field(fd, 'insurance')),
      member_id: cleanText(field(fd, 'member_id')),
      reason_for_visit: cleanText(field(fd, 'reason_for_visit')),
    },
  }
}

/** What only staff set. */
function parsePipelineFields(fd: FormData) {
  const fieldErrors: Record<string, string> = {}

  const stageRaw = field(fd, 'stage')
  const stage = (STAGES as readonly string[]).includes(stageRaw) ? (stageRaw as Stage) : null
  if (!stage) fieldErrors.stage = 'Choose a stage.'

  const date_submitted = field(fd, 'date_submitted').trim() || null
  if (date_submitted && !ISO_DATE_RE.test(date_submitted)) {
    fieldErrors.date_submitted = 'Enter a valid date.'
  }

  return {
    fieldErrors,
    values: {
      stage: stage ?? ('New Lead' as Stage),
      paperwork_complete: fd.get('paperwork_complete') === 'on',
      notes: cleanText(field(fd, 'notes')),
      ...(date_submitted ? { date_submitted } : {}),
    },
  }
}

// ------------------------------------------------------------------ public

/**
 * The one place the privileged client is used. The submitter has no account,
 * so this runs as service_role on their behalf and writes exactly one row with
 * fixed stage/source values the form cannot override.
 */
export async function submitIntake(_prev: FormState, fd: FormData): Promise<FormState> {
  // Honeypot: real browsers leave this hidden field empty; naive bots fill every input.
  if (field(fd, 'website')) redirect('/intake/thanks')

  const { fieldErrors, values } = parseContactFields(fd)
  if (Object.keys(fieldErrors).length) return { fieldErrors }

  const admin = createAdminClient()
  const { error } = await admin
    .from('clients')
    .insert({ ...values, source: 'intake_form', stage: 'New Lead' })

  if (error) {
    console.error('intake insert failed:', error.message)
    return { error: 'Something went wrong on our end. Please try again or call the office.' }
  }

  revalidateClientViews()
  redirect('/intake/thanks')
}

// ------------------------------------------------------------------- staff

export async function createClientRecord(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireUser()

  const contact = parseContactFields(fd)
  const pipeline = parsePipelineFields(fd)
  const fieldErrors = { ...contact.fieldErrors, ...pipeline.fieldErrors }
  if (Object.keys(fieldErrors).length) return { fieldErrors }

  const { data, error } = await supabase
    .from('clients')
    .insert({ ...contact.values, ...pipeline.values, source: 'manual' })
    .select('id')
    .single()

  if (error || !data) {
    console.error('client insert failed:', error?.message)
    return { error: 'Could not save the client.' }
  }

  revalidateClientViews(data.id)
  redirect(`/clients/${data.id}`)
}

export async function updateClientRecord(
  id: string,
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  const { supabase } = await requireUser()

  const contact = parseContactFields(fd)
  const pipeline = parsePipelineFields(fd)
  const fieldErrors = { ...contact.fieldErrors, ...pipeline.fieldErrors }
  if (Object.keys(fieldErrors).length) return { fieldErrors }

  // Optimistic concurrency. The form carries the updated_at it was rendered
  // with; the update applies only if the row still has that value. If a
  // colleague saved first, zero rows match and we refuse rather than silently
  // overwriting their edit with this form's stale copy of every field.
  const seen = field(fd, 'updated_at')
  let query = supabase
    .from('clients')
    .update({ ...contact.values, ...pipeline.values })
    .eq('id', id)
  if (seen) query = query.eq('updated_at', seen)

  const { data, error } = await query.select('id')

  if (error) {
    console.error('client update failed:', error.message)
    return { error: 'Could not save changes.' }
  }
  if (!data || data.length === 0) {
    return {
      error:
        'Someone else saved changes to this client while you were editing. ' +
        'Reload the page to see their version, then reapply yours.',
    }
  }

  revalidateClientViews(id)
  return { saved: true }
}

/**
 * Used by the board's per-card "move to" control.
 *
 * The card sends the stage it was rendered in as `from`, and the move applies
 * only if the row is still there. Otherwise two staff moving the same card at
 * once would produce a second history entry (Y -> Z) for a transition the
 * second person never chose -- they chose X -> Z. If the row has moved on, the
 * board simply re-renders showing where it actually is.
 */
export async function moveStage(fd: FormData): Promise<void> {
  const { supabase } = await requireUser()

  const id = field(fd, 'id')
  const from = field(fd, 'from')
  const stage = field(fd, 'stage')
  if (!id || !(STAGES as readonly string[]).includes(stage)) return

  let query = supabase.from('clients').update({ stage }).eq('id', id)
  if (from) query = query.eq('stage', from)

  const { error } = await query
  if (error) console.error('stage update failed:', error.message)

  revalidateClientViews(id)
}

// -------------------------------------------------------------------- auth

export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = normalizeEmail(field(fd, 'email'))
  const password = field(fd, 'password')
  if (!email || !password) return { error: 'Email and password are required.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: 'Invalid email or password.' }

  // Only follow same-site paths; never an absolute URL someone put in the query.
  const next = field(fd, 'next')
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/clients')
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

/** Where this deployment lives, for building links that come back to it. */
async function siteOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

// ------------------------------------------------------------------- staff accounts

/**
 * Staff onboard staff. Public signup is disabled in Supabase, so this is the
 * only way an account comes into existence after the first one.
 *
 * Rather than relying on Supabase's rate-limited built-in mailer, this asks
 * Supabase to mint the same one-time invite token it would have emailed and
 * hands the resulting link back to the inviter to pass on. Opening the link
 * signs the invitee in and sends them to choose a password.
 */
export async function inviteStaff(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser()

  const email = normalizeEmail(field(fd, 'email'))
  if (!email || !EMAIL_RE.test(email)) {
    return { fieldErrors: { email: 'Enter a valid email address.' } }
  }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({ type: 'invite', email })
  if (error) return { error: error.message }

  const link =
    `${await siteOrigin()}/auth/confirm` +
    `?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=invite`

  revalidatePath('/team')
  return { saved: true, link }
}

/**
 * Fresh link for an invitee who lost theirs. An invite token can't be minted
 * twice for the same address, but a magic-link token does the same job: it
 * signs them in through /auth/confirm and lands on /set-password.
 */
export async function resendInvite(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser()

  const email = normalizeEmail(field(fd, 'email'))
  if (!email) return { error: 'Missing email.' }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) return { error: error.message }

  const link =
    `${await siteOrigin()}/auth/confirm` +
    `?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=magiclink`

  return { saved: true, link }
}

/** Used after an invite link, and by anyone who wants to change their password. */
export async function setPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireUser()

  const password = field(fd, 'password')
  const confirm = field(fd, 'confirm')
  if (password.length < 8) return { fieldErrors: { password: 'Use at least 8 characters.' } }
  if (password !== confirm) return { fieldErrors: { confirm: 'Passwords do not match.' } }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }

  redirect('/clients')
}
