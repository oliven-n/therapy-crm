import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { moveStage } from '@/app/actions'
import { STAGES, formatDate, type Client, type Stage } from '@/lib/types'

/**
 * One column per stage, in funnel order. A per-card select + Move form posts
 * to a server action, so it works without any client-side JavaScript. With 500
 * new leads a week this view is for seeing flow, not finding people -- the
 * list is for that.
 */
export default async function BoardPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, client_name, insurance, stage, date_submitted, paperwork_complete')
    .order('date_submitted', { ascending: false })

  const clients = (data ?? []) as Pick<
    Client,
    'id' | 'client_name' | 'insurance' | 'stage' | 'date_submitted' | 'paperwork_complete'
  >[]

  const byStage = Object.fromEntries(STAGES.map((s) => [s, [] as typeof clients])) as Record<
    Stage,
    typeof clients
  >
  for (const c of clients) (byStage[c.stage] ?? byStage['New Lead']).push(c)

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Pipeline</h1>
        <p className="text-sm text-slate-500">{clients.length} clients</p>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Could not load the board: {error.message}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {STAGES.map((stage) => (
          <section key={stage} className="rounded-lg border border-slate-200 bg-slate-100/60 p-3">
            <h2 className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-600">
              {stage}
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 ring-1 ring-slate-200">
                {byStage[stage].length}
              </span>
            </h2>

            <ul className="mt-3 space-y-2">
              {byStage[stage].map((c) => (
                <li key={c.id} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                  <Link href={`/clients/${c.id}`} className="block text-sm font-medium text-teal-800 hover:underline">
                    {c.client_name}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {c.insurance ?? 'No insurance listed'} · {formatDate(c.date_submitted)}
                    {c.paperwork_complete ? ' · ✓ paperwork' : ''}
                  </p>
                  <form action={moveStage} className="mt-2 flex gap-1">
                    <input type="hidden" name="id" value={c.id} />
                    <select
                      name="stage"
                      defaultValue={c.stage}
                      aria-label={`Move ${c.client_name} to stage`}
                      className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-1.5 py-1 text-xs"
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded bg-slate-800 px-2 py-1 text-xs font-medium text-white hover:bg-slate-900"
                    >
                      Move
                    </button>
                  </form>
                </li>
              ))}
              {byStage[stage].length === 0 && (
                <li className="rounded-md border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">
                  Empty
                </li>
              )}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
