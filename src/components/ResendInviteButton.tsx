'use client'

import { useActionState } from 'react'
import { resendInvite } from '@/app/actions'

export function ResendInviteButton({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(resendInvite, null)

  if (state?.link) {
    return (
      <input
        readOnly
        value={state.link}
        onFocus={(e) => e.currentTarget.select()}
        title="New one-time link — send this to them"
        className="block w-72 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 font-mono text-xs text-slate-800"
      />
    )
  }

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="email" value={email} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-medium text-teal-700 hover:underline disabled:opacity-50"
      >
        {pending ? 'Creating…' : 'Get new link'}
      </button>
      {state?.error && <span className="ml-2 text-xs text-red-600">{state.error}</span>}
    </form>
  )
}
