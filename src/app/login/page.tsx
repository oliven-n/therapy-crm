import { LoginForm } from '@/components/LoginForm'

type Props = { searchParams: Promise<{ next?: string; error?: string }> }

export default async function LoginPage({ searchParams }: Props) {
  const { next = '/clients', error } = await searchParams

  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="text-2xl font-semibold text-slate-900">Staff sign in</h1>
      <p className="mt-1 text-sm text-slate-500">Client records are visible to signed-in staff only.</p>
      {error === 'invalid_link' && (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          That invite link is invalid or has already been used. Ask a colleague for a new one.
        </p>
      )}
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <LoginForm next={next} />
      </div>
    </div>
  )
}
