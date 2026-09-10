import { LoginForm } from '@/components/LoginForm'

type Props = { searchParams: Promise<{ next?: string }> }

export default async function LoginPage({ searchParams }: Props) {
  const { next = '/clients' } = await searchParams

  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="text-2xl font-semibold text-slate-900">Staff sign in</h1>
      <p className="mt-1 text-sm text-slate-500">Client records are visible to signed-in staff only.</p>
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <LoginForm next={next} />
      </div>
    </div>
  )
}
