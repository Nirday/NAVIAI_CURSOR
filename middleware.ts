import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Set a header with the pathname so layouts can detect the current route
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)
  
  // Create a response object
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // TEMPORARY: Force mock mode ON until Supabase is properly configured
  // TODO: Remove this hardcode when ready to use real Supabase
  const isMockMode = true

  // In mock mode, skip Supabase auth check (sessions are client-side only)
  if (isMockMode) {
    return response
  }

  // Create Supabase client for session refresh (only in real mode)
  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Refresh session if expired - this ensures cookies are synced
    await supabase.auth.getUser()
  } catch (error) {
    // If Supabase client creation fails, continue anyway
    console.warn('Middleware: Supabase client error (might be in mock mode):', error)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

