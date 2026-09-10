import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * The default client for server components and server actions.
 *
 * Uses the publishable key and carries the caller's session cookie, so Postgres
 * sees the request as `anon` when nobody is signed in and `authenticated` once
 * someone is. Every query it makes is subject to RLS.
 *
 * Create a new one per request -- never share a client across requests.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server Components cannot set cookies. Harmless here: proxy.ts
            // refreshes the session on every request, so the write it drops has
            // already happened there.
          }
        },
      },
    }
  )
}
