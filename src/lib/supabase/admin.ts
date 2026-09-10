import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Privileged client. Holds the secret key, so it bypasses RLS entirely.
 *
 * There is exactly one legitimate use in this app: the public intake form,
 * where the submitter has no account by definition and therefore cannot be
 * `authenticated`. Everything a staff member does goes through
 * lib/supabase/server.ts instead, so their own permissions apply.
 *
 * The `server-only` import above is a build-time guard: importing this file
 * from a client component fails the build rather than shipping the secret key
 * to a browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
