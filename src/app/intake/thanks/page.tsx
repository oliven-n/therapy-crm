import Link from 'next/link'

export default function ThanksPage() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Thank you</h1>
      <p className="mt-3 text-slate-600">
        We&apos;ve received your information. Someone from our intake team will be in touch
        within two business days.
      </p>
      <Link href="/" className="mt-8 inline-block text-sm font-medium text-teal-700 hover:underline">
        ← Back to home
      </Link>
    </div>
  )
}
