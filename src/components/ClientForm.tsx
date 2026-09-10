'use client'

import { useActionState } from 'react'
import { STAGES, formatPhone, type Client } from '@/lib/types'
import type { FormState } from '@/app/actions'

type Props = {
  action: (state: FormState, fd: FormData) => Promise<FormState>
  initial?: Partial<Client>
  /** intake: what a prospective client fills in. staff: everything, including pipeline fields. */
  mode: 'intake' | 'staff'
  submitLabel: string
}

const INSURERS = ['Aetna', 'BCBS', 'Cigna', 'Oxford', 'United Healthcare', 'Self-Pay']

const input =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600'
const label = 'block text-sm font-medium text-slate-700'

function Field({
  id,
  text,
  error,
  children,
}: {
  id: string
  text: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className={label}>
        {text}
      </label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

export function ClientForm({ action, initial = {}, mode, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, null)
  const err = state?.fieldErrors ?? {}
  const staff = mode === 'staff'

  return (
    <form action={formAction} className="space-y-8">
      {state?.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state?.saved && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Changes saved.
        </div>
      )}

      {/* Honeypot for the public form. Hidden from people, visible to naive bots. */}
      {!staff && (
        <div className="hidden" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field id="client_name" text="Full name" error={err.client_name}>
            <input
              id="client_name"
              name="client_name"
              type="text"
              required
              autoComplete="name"
              defaultValue={initial.client_name ?? ''}
              className={input}
            />
          </Field>
        </div>

        <Field id="date_of_birth" text="Date of birth" error={err.date_of_birth}>
          <input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            autoComplete="bday"
            defaultValue={initial.date_of_birth ?? ''}
            className={input}
          />
        </Field>

        <Field id="phone" text="Phone" error={err.phone}>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="(917) 555-0100"
            defaultValue={formatPhone(initial.phone ?? null)}
            className={input}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field id="email" text="Email" error={err.email}>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={initial.email ?? ''}
              className={input}
            />
          </Field>
        </div>

        <Field id="insurance" text="Insurance" error={err.insurance}>
          <input
            id="insurance"
            name="insurance"
            type="text"
            list="insurers"
            placeholder="Aetna, Cigna, Self-Pay…"
            defaultValue={initial.insurance ?? ''}
            className={input}
          />
          <datalist id="insurers">
            {INSURERS.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
        </Field>

        <Field id="member_id" text="Member ID" error={err.member_id}>
          <input
            id="member_id"
            name="member_id"
            type="text"
            defaultValue={initial.member_id ?? ''}
            className={input}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field
            id="reason_for_visit"
            text={staff ? 'Reason for visit' : 'What brings you in?'}
            error={err.reason_for_visit}
          >
            <textarea
              id="reason_for_visit"
              name="reason_for_visit"
              rows={3}
              defaultValue={initial.reason_for_visit ?? ''}
              className={input}
            />
          </Field>
        </div>
      </section>

      {staff && (
        <section className="space-y-5 border-t border-slate-200 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Pipeline</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field id="stage" text="Stage" error={err.stage}>
              <select
                id="stage"
                name="stage"
                defaultValue={initial.stage ?? 'New Lead'}
                className={input}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="date_submitted" text="Date submitted" error={err.date_submitted}>
              <input
                id="date_submitted"
                name="date_submitted"
                type="date"
                defaultValue={initial.date_submitted ?? ''}
                className={input}
              />
            </Field>

            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="paperwork_complete"
                name="paperwork_complete"
                type="checkbox"
                defaultChecked={initial.paperwork_complete ?? false}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
              />
              <label htmlFor="paperwork_complete" className="text-sm text-slate-700">
                Paperwork complete
              </label>
            </div>

            <div className="sm:col-span-2">
              <Field id="notes" text="Notes" error={err.notes}>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  defaultValue={initial.notes ?? ''}
                  className={input}
                />
              </Field>
            </div>
          </div>
        </section>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-800 disabled:opacity-50"
        >
          {pending ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
