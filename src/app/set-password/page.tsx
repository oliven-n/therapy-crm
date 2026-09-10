import { createClient } from '@/lib/supabase/server'
import { PasswordForm } from '@/components/PasswordForm'

export default async function SetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="text-2xl font-semibold text-slate-900">Set your password</h1>
      <p className="mt-1 text-sm text-slate-500">
        {user?.email ? `Signed in as ${user.email}. ` : ''}
        Choose the password you&apos;ll use to sign in from now on.
      </p>
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <PasswordForm />
      </div>
    </div>
  )
}
