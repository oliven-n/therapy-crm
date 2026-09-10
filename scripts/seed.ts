/**
 * Seeds the clients table from data/therapy_clients_dummy_data.csv.
 *
 * The source file is deliberately messy. Every normalization decision made here
 * is recorded alongside the untouched original row in clients.raw_import, so a
 * bad guess is always auditable rather than silently destructive.
 *
 * Idempotent: deletes prior csv_import rows before inserting, so re-running
 * never duplicates. Records created in-app (source != 'csv_import') are safe.
 *
 * Run with:  npm run seed
 */
import { readFileSync } from 'node:fs'
import { parse } from 'csv-parse/sync'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const CSV_PATH = 'data/therapy_clients_dummy_data.csv'

const VALID_STAGES = [
  'New Lead', 'Contacted', 'Verified', 'Booked', 'Paperwork Pending', 'Active',
] as const

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

/** Collected notes about anything ambiguous, printed as a report at the end. */
const warnings: string[] = []

// ---------------------------------------------------------------- normalizers

/** "jane DOE" -> "Jane Doe", "o'neill" -> "O'Neill" */
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s'\-.])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}

/**
 * Names arrive as "First Last", "Last, First", or split across two CSV fields
 * when an unquoted comma broke the row. Returns "First Last".
 */
function normalizeName(raw: string): string {
  const s = raw.replace(/\s+/g, ' ').trim()
  if (s.includes(',')) {
    const [last, ...rest] = s.split(',')
    const first = rest.join(' ').trim()
    if (first) return titleCase(`${first} ${last.trim()}`)
  }
  return titleCase(s)
}

function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * Handles every format present in the source:
 *   1990-07-03 | 04/12/1988 | 7/9/92 | March 15 1985 | 12-Mar-1979
 *
 * Slash dates are read as US month/day/year. That is an assumption, not a fact
 * the data states -- 04/12/1988 could be 4 December. Every phone number in the
 * file is a NYC area code and every insurer is a US carrier, so US ordering is
 * the reasonable read, and raw_import keeps the original either way.
 */
function normalizeDate(raw: string, label: string): string | null {
  const s = raw.trim()
  if (!s) return null

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return iso(+m[1], +m[2], +m[3])

  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  if (m) {
    let year = +m[3]
    if (m[3].length === 2) {
      // Two-digit years appear in both dates of birth and submission dates, so
      // the pivot has to serve both: 92 -> 1992 (a birth year), 25 -> 2025 (a
      // submission year). Nothing in this data set is born after 2030.
      year = year <= 30 ? 2000 + year : 1900 + year
      warnings.push(`${label}: two-digit year "${m[3]}" read as ${year}`)
    }
    return iso(year, +m[1], +m[2])
  }

  m = s.match(/^([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})$/)
  if (m) {
    const mo = MONTHS[m[1].slice(0, 3).toLowerCase()]
    if (mo) return iso(+m[3], mo, +m[2])
  }

  m = s.match(/^(\d{1,2})-([A-Za-z]{3,})-(\d{4})$/)
  if (m) {
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()]
    if (mo) return iso(+m[3], mo, +m[1])
  }

  warnings.push(`${label}: could not parse date "${s}" -- stored as null`)
  return null
}

/** no | n | N | false | "" -> false;  yes | y | Y | YES | TRUE -> true */
function normalizeBool(raw: string): boolean {
  return /^(y|yes|true|t|1)$/i.test(raw.trim())
}

/** Any US format -> E.164 (+19175550142). The UI formats it for display. */
function normalizePhone(raw: string, label: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  warnings.push(`${label}: unexpected phone "${raw}" -- stored as digits only`)
  return `+${digits}`
}

function normalizeEmail(raw: string): string | null {
  const s = raw.trim().toLowerCase()
  return s || null
}

function normalizeStage(raw: string, label: string): string {
  const s = raw.trim()
  const hit = VALID_STAGES.find((v) => v.toLowerCase() === s.toLowerCase())
  if (hit) return hit
  warnings.push(`${label}: unknown stage "${s}" -- defaulted to New Lead`)
  return 'New Lead'
}

function blankToNull(raw: string): string | null {
  const s = raw.replace(/\s+/g, ' ').trim()
  return s || null
}

// ----------------------------------------------------------------------- main

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const raw = readFileSync(CSV_PATH, 'utf8')
  const rows: string[][] = parse(raw, { relax_column_count: true, skip_empty_lines: true })
  const header = rows[0]
  const at = (r: string[], name: string) => r[header.indexOf(name)] ?? ''

  const records = rows.slice(1).map((row, i) => {
    const lineNo = i + 2
    let r = row

    // One source row has an unquoted comma inside the name field, producing an
    // extra column and shifting every later value right by one. Rejoin the two
    // name fields rather than dropping an otherwise valid client.
    if (r.length === header.length + 1) {
      warnings.push(
        `line ${lineNo}: unquoted comma in name -- rejoined "${r[0]},${r[1]}" and realigned columns`
      )
      r = [`${r[0]},${r[1]}`, ...r.slice(2)]
    }

    const name = normalizeName(at(r, 'client_name'))
    const label = `line ${lineNo} (${name})`

    return {
      client_name: name,
      date_of_birth: normalizeDate(at(r, 'date_of_birth'), label),
      email: normalizeEmail(at(r, 'email')),
      phone: normalizePhone(at(r, 'phone'), label),
      insurance: blankToNull(at(r, 'insurance')),
      member_id: blankToNull(at(r, 'member_id')),
      reason_for_visit: blankToNull(at(r, 'reason_for_visit')),
      stage: normalizeStage(at(r, 'stage'), label),
      date_submitted: normalizeDate(at(r, 'date_submitted'), label),
      paperwork_complete: normalizeBool(at(r, 'paperwork_complete')),
      notes: blankToNull(at(r, 'notes')),
      source: 'csv_import',
      raw_import: Object.fromEntries(header.map((h, j) => [h, row[j] ?? null])),
    }
  })

  const report = () => {
    if (!warnings.length) return
    console.log(`\n${warnings.length} normalization note(s):`)
    for (const w of warnings) console.log(`  - ${w}`)
    console.log('\nOriginal values are preserved in clients.raw_import.')
  }

  if (dryRun) {
    console.table(
      records.map((r) => ({
        name: r.client_name,
        dob: r.date_of_birth,
        phone: r.phone,
        email: r.email,
        stage: r.stage,
        paperwork: r.paperwork_complete,
        submitted: r.date_submitted,
      }))
    )
    console.log(`\nDry run: parsed ${records.length} rows, wrote nothing.`)
    report()
    return
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Copy .env.local.example to .env.local and fill in the values from your\n' +
      'Supabase dashboard under Project Settings > API Keys.'
    )
    process.exit(1)
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const { error: delError } = await supabase.from('clients').delete().eq('source', 'csv_import')
  if (delError) throw delError

  const { data, error } = await supabase.from('clients').insert(records).select('id')
  if (error) throw error

  console.log(`Seeded ${data?.length ?? 0} clients from ${CSV_PATH}.`)
  report()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
