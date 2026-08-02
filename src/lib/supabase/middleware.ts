import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isNetworkError } from './networkError'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  let isNetError = false

  try {
    const {
      data: { user: fetchedUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError && isNetworkError(authError)) {
      isNetError = true
    } else if (fetchedUser) {
      user = fetchedUser
    }
  } catch (err) {
    if (isNetworkError(err)) {
      isNetError = true
    }
  }

  if (isNetError) {
    return supabaseResponse
  }

  const isAuthPage =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup') ||
    request.nextUrl.pathname.startsWith('/forgot-password') ||
    request.nextUrl.pathname.startsWith('/reset-password')

  const isCallbackPage = request.nextUrl.pathname.startsWith('/auth/callback')
  const isPublicApi = request.nextUrl.pathname.startsWith('/api/auth/verify-email')

  // Guests are NOT allowed. If they are not logged in and not on auth pages, redirect to login.
  if (!user && !isAuthPage && !isCallbackPage && !isPublicApi) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If logged in, block them from landing/auth pages (redirect to dashboard)
  if (user && isAuthPage && request.nextUrl.pathname !== '/reset-password') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Redirect any visits to /verify directly to /dashboard since verification is disabled
  if (user && request.nextUrl.pathname === '/verify') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
