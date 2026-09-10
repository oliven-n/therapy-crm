'use client'

import { useActionState } from 'react'
import { inviteStaff } from '@/app/actions'

const input =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600'

export function InviteForm() {
  const [state, formAction, pending] = useActionState(inviteStaff, null)

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <label htmlFor="email" className="sr-only">
            Colleague&apos;s email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="colleague@practice.com"
            className={input}
          />
          {state?.fieldErrors?.email && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.email}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-800 disabled:opacity-50"
        >
          {pending ? 'Creating…' : 'Create invite'}
        </button>
      </div>

      {state?.link && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">
            Account created. Send them this link — it works once and signs them straight in to
            choose a password.
          </p>
          <input
            readOnly
            value={state.link}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-2 block w-full rounded-md border border-emerald-300 bg-white px-3 py-2 font-mono text-xs text-slate-800"
          />
        </div>
      )}
    </form>
  )
}
