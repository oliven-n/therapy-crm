import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Runs before every request (Next 16 calls this "proxy"; it was "middleware").
 *
 * Two jobs:
 *   1. Refresh the Supabase session cookie if it's expiring. Server Components
 *      can't write cookies, so this is the only place a refreshed token gets
 *      persisted.
 *   2. Bounce signed-out visitors away from staff pages. This is a convenience
 *      redirect, not the security boundary -- the database refuses unauthenticated
 *      reads regardless, and every server action re-checks the session itself.
 */

const PUBLIC_PATHS = ['/', '/intake', '/login']

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || (p !== '/' && pathname.startsWith(`${p}/`)))
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  // getUser() validates the token with Supabase's auth server on every request.
  // getSession() would only read the cookie, which a client can forge.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/clients'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Everything except Next internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
