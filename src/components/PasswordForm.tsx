'use client'

import { useActionState } from 'react'
import { setPassword } from '@/app/actions'

const input =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600'

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(setPassword, null)
  const err = state?.fieldErrors ?? {}

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={`mt-1 ${input}`}
        />
        {err.password && <p className="mt-1 text-sm text-red-600">{err.password}</p>}
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-slate-700">
          Confirm password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          className={`mt-1 ${input}`}
        />
        {err.confirm && <p className="mt-1 text-sm text-red-600">{err.confirm}</p>}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-800 disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save password'}
      </button>
    </form>
  )
}
