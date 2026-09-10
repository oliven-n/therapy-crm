import type { Metadata } from 'next'
import Link from 'next/link'
import { Geist, Geist_Mono } from 'next/font/google'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Therapy Practice CRM',
  description: 'Prototype intake and client pipeline for a therapy practice.',
}

const navLink = 'rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900'

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-6">
              <Link href={user ? '/clients' : '/'} className="text-base font-semibold text-teal-800">
                Therapy CRM
              </Link>
              {user && (
                <div className="flex items-center gap-1">
                  <Link href="/clients" className={navLink}>Clients</Link>
                  <Link href="/board" className={navLink}>Board</Link>
                  <Link href="/clients/new" className={navLink}>+ Add client</Link>
                  <Link href="/team" className={navLink}>Team</Link>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <Link href="/intake" className={navLink} title="Preview the public intake form">
                    Intake form
                  </Link>
                  <span className="hidden text-sm text-slate-500 sm:inline">{user.email}</span>
                  <form action={signOut}>
                    <button type="submit" className={navLink}>Sign out</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/intake" className={navLink}>Intake form</Link>
                  <Link href="/login" className={navLink}>Staff sign in</Link>
                </>
              )}
            </div>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>

        <footer className="border-t border-slate-200 bg-white">
          <p className="mx-auto max-w-6xl px-4 py-3 text-xs text-slate-500 sm:px-6">
            Prototype. All client records are synthetic. Not for real patient data.
          </p>
        </footer>
      </body>
    </html>
  )
}
