import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientForm } from '@/components/ClientForm'
import { StageBadge } from '@/components/StageBadge'
import { updateClientRecord } from '@/app/actions'
import {
  ageFrom,
  formatDate,
  formatFieldValue,
  FIELD_LABELS,
  type Client,
  type FieldHistoryEntry,
  type StageHistoryEntry,
} from '@/lib/types'

type Props = { params: Promise<{ id: string }> }

const SOURCE_LABEL: Record<Client['source'], string> = {
  intake_form: 'Web intake form',
  csv_import: 'Imported from spreadsheet',
  manual: 'Added by staff',
}

export default async function ClientPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const [{ data }, { data: stageRows }, { data: fieldRows }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('client_stage_history')
      .select('id, from_stage, to_stage, changed_at, changed_by_email')
      .eq('client_id', id),
    supabase
      .from('client_field_history')
      .select('id, field, old_value, new_value, changed_at, changed_by_email')
      .eq('client_id', id),
  ])
  if (!data) notFound()

  const client = data as Client
  const when = (iso: string) =>
    new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

  // One timeline: stage moves and field edits interleaved, newest first.
  type Event = { key: string; at: string; by: string | null; body: React.ReactNode }
  const events: Event[] = [
    ...((stageRows ?? []) as StageHistoryEntry[]).map((h) => ({
      key: `s${h.id}`,
      at: h.changed_at,
      by: h.changed_by_email,
      body: h.from_stage ? (
        <>
          Stage: {h.from_stage} <span className="text-slate-400">→</span> <strong>{h.to_stage}</strong>
        </>
      ) : (
        <>
          Created as <strong>{h.to_stage}</strong>
        </>
      ),
    })),
    ...((fieldRows ?? []) as FieldHistoryEntry[]).map((h) => ({
      key: `f${h.id}`,
      at: h.changed_at,
      by: h.changed_by_email,
      body: (
        <>
          {FIELD_LABELS[h.field] ?? h.field}:{' '}
          <span className="text-slate-500 line-through">{formatFieldValue(h.field, h.old_value)}</span>{' '}
          <span className="text-slate-400">→</span> <strong>{formatFieldValue(h.field, h.new_value)}</strong>
        </>
      ),
    })),
  ].sort((a, b) => b.at.localeCompare(a.at))
  const age = ageFrom(client.date_of_birth)
  const updateAction = updateClientRecord.bind(null, client.id)

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/clients" className="text-sm text-slate-500 hover:underline">← Clients</Link>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">{client.client_name}</h1>
        <StageBadge stage={client.stage} />
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
        {age !== null && (
          <div><dt className="inline">Age </dt><dd className="inline text-slate-700">{age}</dd></div>
        )}
        <div><dt className="inline">Submitted </dt><dd className="inline text-slate-700">{formatDate(client.date_submitted)}</dd></div>
        <div><dt className="inline">Source </dt><dd className="inline text-slate-700">{SOURCE_LABEL[client.source]}</dd></div>
        <div><dt className="inline">Last updated </dt><dd className="inline text-slate-700">{new Date(client.updated_at).toLocaleString('en-US')}</dd></div>
      </dl>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <ClientForm action={updateAction} initial={client} mode="staff" submitLabel="Save changes" />
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
          History
        </h2>
        <ol className="divide-y divide-slate-100">
          {events.map((e) => (
            <li key={e.key} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
              <span className="text-slate-800">{e.body}</span>
              <span className="text-slate-500">{when(e.at)}</span>
              <span className="text-slate-500">{e.by ? `by ${e.by}` : 'by intake form / import'}</span>
            </li>
          ))}
          {events.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">No changes recorded yet.</li>
          )}
        </ol>
      </section>

      {client.raw_import && (
        <details className="mt-6 rounded-lg border border-slate-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">
            Original spreadsheet row
          </summary>
          <div className="border-t border-slate-100 px-4 py-3">
            <p className="mb-3 text-xs text-slate-500">
              Exactly as it appeared in the import file, before any cleanup. If a value above
              looks wrong, this is what it was parsed from.
            </p>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {Object.entries(client.raw_import).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="w-40 shrink-0 font-mono text-xs text-slate-500">{k}</dt>
                  <dd className="whitespace-pre-wrap break-all text-slate-700">{v || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
        </details>
      )}
    </div>
  )
}
