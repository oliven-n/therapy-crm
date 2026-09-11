import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { InviteForm } from '@/components/InviteForm'
import { ResendInviteButton } from '@/components/ResendInviteButton'
import { RemoveStaffButton } from '@/components/RemoveStaffButton'
import { formatDateTime } from '@/lib/types'

type Props = { searchParams: Promise<{ error?: string }> }

const ERRORS: Record<string, string> = {
  self: "You can't remove your own account. Ask a colleague to do it.",
  last: "That's the only account. Removing it would lock everyone out.",
  failed: 'Could not remove that account. Try again.',
}

/**
 * Lists staff accounts and creates invites. Listing users requires the admin
 * API, so unlike the client pages this one checks the session explicitly
 * rather than letting RLS refuse an unauthenticated read.
 */
export default async function TeamPage({ searchParams }: Props) {
  const { error: errorCode } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 })
  const users = (data?.users ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at))

  const fmt = formatDateTime

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900">Team</h1>
      <p className="mt-1 text-sm text-slate-500">
        Everyone here can see and edit every client. Public signup is off, so this page is the
        only way a new account gets created.
      </p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">Invite a colleague</h2>
        <div className="mt-3">
          <InviteForm />
        </div>
      </div>

      {errorCode && ERRORS[errorCode] && (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {ERRORS[errorCode]}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Could not list accounts: {error.message}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Last sign-in</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {u.email}
                  {u.id === user.id && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                </td>
                <td className="px-4 py-3 text-slate-600">{fmt(u.created_at)}</td>
                <td className="px-4 py-3 text-slate-600">{fmt(u.last_sign_in_at)}</td>
                <td className="px-4 py-3 text-slate-600">
                  {u.last_sign_in_at ? (
                    'Active'
                  ) : (
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      Invited, not yet signed in
                      {u.email && <ResendInviteButton email={u.email} />}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {u.id !== user.id && users.length > 1 && (
                    <RemoveStaffButton id={u.id} email={u.email ?? 'this account'} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
