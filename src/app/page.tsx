import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** Public landing page. Signed-in staff have no business here; send them to work. */
export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/clients')

  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        Couples &amp; Family Therapy Practice
      </h1>
      <p className="mt-4 text-slate-600">
        Ready to get started? Tell us a little about yourself and our intake team will reach
        out to schedule your first appointment.
      </p>
      <div className="mt-8 flex items-center justify-center gap-4">
        <Link
          href="/intake"
          className="rounded-md bg-teal-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-800"
        >
          Start intake form
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Staff sign in →
        </Link>
      </div>
    </div>
  )
}
