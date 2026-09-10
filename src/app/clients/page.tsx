import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { escapeLike } from '@/lib/normalize'
import { STAGES, formatDate, formatPhone, type Client } from '@/lib/types'
import { StageBadge } from '@/components/StageBadge'

type Search = { q?: string; stage?: string; insurance?: string; dob?: string }
type Props = { searchParams: Promise<Search> }

const input =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600'

/**
 * Filters live in the URL, so this Server Component re-runs with new query
 * params and Postgres does the filtering. Nothing is fetched to the browser
 * and then narrowed there.
 */
export default async function ClientsPage({ searchParams }: Props) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const stage = (sp.stage ?? '').trim()
  const insurance = (sp.insurance ?? '').trim()
  const dob = (sp.dob ?? '').trim()

  const supabase = await createClient()

  let query = supabase
    .from('clients')
    .select('*')
    .order('date_submitted', { ascending: false })
    .order('created_at', { ascending: false })

  if (q) query = query.ilike('client_name', `%${escapeLike(q)}%`)
  if (stage) query = query.eq('stage', stage)
  if (insurance) query = query.eq('insurance', insurance)
  if (dob) query = query.eq('date_of_birth', dob)

  const [{ data: clients, error }, { data: insuranceRows }] = await Promise.all([
    query,
    supabase.from('clients').select('insurance').not('insurance', 'is', null),
  ])

  const insurers = [...new Set((insuranceRows ?? []).map((r) => r.insurance as string))].sort()
  const rows = (clients ?? []) as Client[]
  const filtered = Boolean(q || stage || insurance || dob)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Clients</h1>
        <Link
          href="/clients/new"
          className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
        >
          + Add client
        </Link>
      </div>

      <form method="get" className="mt-6 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-5">
        <input name="q" type="search" placeholder="Search by name" defaultValue={q} className={`${input} sm:col-span-2`} />
        <select name="stage" defaultValue={stage} className={input}>
          <option value="">Any stage</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select name="insurance" defaultValue={insurance} className={input}>
          <option value="">Any insurance</option>
          {insurers.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
        <input name="dob" type="date" defaultValue={dob} title="Date of birth" className={input} />
        <div className="flex items-center gap-3 sm:col-span-5">
          <button type="submit" className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900">
            Filter
          </button>
          {filtered && (
            <Link href="/clients" className="text-sm text-slate-600 hover:underline">Clear</Link>
          )}
          <span className="ml-auto text-sm text-slate-500">
            {rows.length} {rows.length === 1 ? 'client' : 'clients'}
          </span>
        </div>
      </form>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Could not load clients: {error.message}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Date of birth</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Insurance</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Paperwork</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/clients/${c.id}`} className="text-teal-800 hover:underline">
                    {c.client_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">{formatDate(c.date_of_birth)}</td>
                <td className="px-4 py-3 text-slate-700">{formatPhone(c.phone)}</td>
                <td className="px-4 py-3 text-slate-700">{c.insurance ?? ''}</td>
                <td className="px-4 py-3"><StageBadge stage={c.stage} /></td>
                <td className="px-4 py-3 text-slate-700">{formatDate(c.date_submitted)}</td>
                <td className="px-4 py-3 text-slate-700">{c.paperwork_complete ? 'Complete' : '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && !error && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  {filtered ? 'No clients match these filters.' : 'No clients yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
