import { ClientForm } from '@/components/ClientForm'
import { submitIntake } from '@/app/actions'

export default function IntakePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">New client intake</h1>
      <p className="mt-2 text-sm text-slate-600">
        A few details so our intake team can reach you and check your coverage. Nothing here
        commits you to anything, and you can leave any field blank except your name.
      </p>
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <ClientForm action={submitIntake} mode="intake" submitLabel="Submit" />
      </div>
    </div>
  )
}
