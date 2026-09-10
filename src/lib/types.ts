/** Shared types and display helpers for client records. */

/**
 * The pipeline, in funnel order. This array is the single source of truth --
 * the board renders one column per entry, the filter dropdown lists them, and
 * the order here is the order staff see. Must stay in sync with the
 * clients_stage_valid check constraint in the initial migration.
 */
export const STAGES = ['New Lead', 'Contacted', 'Verified', 'Booked', 'Active'] as const

/** Postgres check-constraint violation. */
export const PG_CHECK_VIOLATION = '23514'
export const PAPERWORK_GATE_MESSAGE =
  'Paperwork must be marked complete before a client can be made Active.'

export type Stage = (typeof STAGES)[number]

export type Source = 'intake_form' | 'csv_import' | 'manual'

export type Client = {
  id: string
  created_at: string
  updated_at: string
  client_name: string
  date_of_birth: string | null
  email: string | null
  phone: string | null
  insurance: string | null
  member_id: string | null
  reason_for_visit: string | null
  stage: Stage
  date_submitted: string
  paperwork_complete: boolean
  notes: string | null
  source: Source
  raw_import: Record<string, string | null> | null
}

/** Stages are plain strings here: history may reference stages that no longer exist. */
export type StageHistoryEntry = {
  id: number
  from_stage: string | null
  to_stage: string
  changed_at: string
  changed_by_email: string | null
}

export type FieldHistoryEntry = {
  id: number
  field: string
  old_value: string | null
  new_value: string | null
  changed_at: string
  changed_by_email: string | null
}

/** Column name -> what staff call it. Anything not listed falls back to the column name. */
export const FIELD_LABELS: Record<string, string> = {
  client_name: 'Name',
  date_of_birth: 'Date of birth',
  email: 'Email',
  phone: 'Phone',
  insurance: 'Insurance',
  member_id: 'Member ID',
  reason_for_visit: 'Reason for visit',
  date_submitted: 'Date submitted',
  paperwork_complete: 'Paperwork complete',
  notes: 'Notes',
}

/** Render a raw history value the way the field is shown elsewhere in the app. */
export function formatFieldValue(field: string, value: string | null): string {
  if (value === null || value === '') return '—'
  if (field === 'phone') return formatPhone(value)
  if (field === 'date_of_birth' || field === 'date_submitted') return formatDate(value)
  if (field === 'paperwork_complete') return value === 'true' ? 'Yes' : 'No'
  return value
}

/** Phones are stored E.164 (+19175550142); staff read them formatted. */
export function formatPhone(value: string | null): string {
  if (!value) return ''
  const digits = value.replace(/\D/g, '')
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (ten.length !== 10) return value
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
}

/** Dates are stored ISO (1988-04-12); this is a US practice, so show M/D/YYYY. */
export function formatDate(value: string | null): string {
  if (!value) return ''
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return value
  return `${Number(m[2])}/${Number(m[3])}/${m[1]}`
}

export function ageFrom(dob: string | null): number | null {
  if (!dob) return null
  const born = new Date(dob)
  if (Number.isNaN(born.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  const beforeBirthday =
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())
  if (beforeBirthday) age -= 1
  return age
}
