/**
 * Input normalizers shared by every form that writes a client record.
 * The seed script has its own, more forgiving versions because it has to cope
 * with a messy file; these are stricter because a form can push back.
 */

export function cleanText(raw: FormDataEntryValue | null | undefined): string | null {
  const s = String(raw ?? '').replace(/\s+/g, ' ').trim()
  return s || null
}

export function normalizeEmail(raw: FormDataEntryValue | null | undefined): string | null {
  const s = String(raw ?? '').trim().toLowerCase()
  return s || null
}

/** E.164 for a 10-digit US number, with or without a leading 1. Null if it isn't one. */
export function normalizePhone(raw: FormDataEntryValue | null | undefined): string | null {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

/** Escape ILIKE wildcards so a search for "100%" doesn't match everything. */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`)
}
