import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const TYPES: EmailOtpType[] = ['invite', 'recovery', 'magiclink', 'signup', 'email', 'email_change']

/**
 * Where invite links land. Exchanges the one-time token for a session (which
 * sets the auth cookies -- route handlers may write cookies, unlike Server
 * Components) and sends the new user to pick a password.
 */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type') as EmailOtpType | null

  const dest = request.nextUrl.clone()
  dest.search = ''

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      dest.pathname = '/set-password'
      return NextResponse.redirect(dest)
    }
  }

  dest.pathname = '/login'
  dest.searchParams.set('error', 'invalid_link')
  return NextResponse.redirect(dest)
}
