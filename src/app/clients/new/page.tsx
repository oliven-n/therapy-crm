import Link from 'next/link'
import { ClientForm } from '@/components/ClientForm'
import { createClientRecord } from '@/app/actions'

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/clients" className="text-sm text-slate-500 hover:underline">← Clients</Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Add client</h1>
      <p className="mt-1 text-sm text-slate-500">
        For clients who reached out by phone or referral instead of the web form.
      </p>
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <ClientForm action={createClientRecord} mode="staff" submitLabel="Create client" />
      </div>
    </div>
  )
}
