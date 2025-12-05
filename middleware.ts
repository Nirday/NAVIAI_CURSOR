import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Set a header with the pathname so layouts can detect the current route
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  
  // Create a response object
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Check if we're in mock mode
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' || 
                     !supabaseUrl || 
                     !supabaseAnonKey ||
                     supabaseUrl === 'http://localhost:54321' ||
                     supabaseAnonKey === 'mock-key'

  // In mock mode, skip Supabase auth check (sessions are client-side only)
  if (isMockMode) {
    return response
  }

  // Define public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/api/auth/callback', // All auth callback routes
  ]
  
  // Check if current path is a public route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  // If it's a public route, skip auth checks (but still refresh session if possible)
  if (isPublicRoute) {
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
      
      // Refresh session silently for public routes
      await supabase.auth.getUser()
    } catch (error) {
      // Ignore errors on public routes
    }
    
    return response
  }

  // For protected routes, check authentication
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

    // Use getUser() instead of getSession() for security
    // This refreshes the session automatically
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Check if user is authenticated
    // If authError exists but it's just a token refresh issue, try getSession as fallback
    let isAuthenticated = !authError && user !== null
    
    // Fallback: if getUser fails, try getSession (less secure but handles edge cases)
    // This is important after profile save when cookies might not be fully synced
    if (!isAuthenticated && authError) {
      const { data: { session } } = await supabase.auth.getSession()
      isAuthenticated = !!session?.user
    }
    
    // If on login page and authenticated, redirect to dashboard
    if (pathname === '/login' && isAuthenticated) {
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
    
    // If on dashboard route and NOT authenticated, check referer to see if coming from onboarding
    // If coming from onboarding, be more lenient - might be a timing issue with cookies
    const referer = request.headers.get('referer') || ''
    const isComingFromOnboarding = referer.includes('/dashboard/onboarding') || 
                                    referer.includes('/onboarding')
    
    if (pathname.startsWith('/dashboard') && !isAuthenticated) {
      // If coming from onboarding, wait a bit and check again (don't redirect immediately)
      // This handles the case where cookies aren't synced yet after profile save
      if (isComingFromOnboarding) {
        // Try one more time with getSession as a final check
        const { data: { session: finalSession } } = await supabase.auth.getSession()
        if (finalSession?.user) {
          // Session exists, allow through
          isAuthenticated = true
        } else {
          // Still no session, but coming from onboarding - might be cookie sync issue
          // Log warning but allow through - client-side will handle redirect if needed
          console.warn('No session found after onboarding, but allowing through due to referer')
          // Don't redirect - let the dashboard page handle it
          return response
        }
      }
      
      // If still not authenticated and not coming from onboarding, redirect to login
      if (!isAuthenticated) {
        // Clear any invalid cookies only if it's a real auth error (not refresh issue)
        if (authError && !authError.message?.includes('refresh')) {
          request.cookies.getAll().forEach(cookie => {
            if (cookie.name.includes('sb-') && cookie.name.includes('auth-token')) {
              response.cookies.delete(cookie.name)
            }
          })
        }
        
        const loginUrl = new URL('/login', request.url)
        return NextResponse.redirect(loginUrl)
      }
    }
    
    // For other protected routes (not login, not dashboard), check auth
    if (!isPublicRoute && !pathname.startsWith('/dashboard') && !isAuthenticated) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
    
  } catch (error) {
    // If Supabase client creation fails, only redirect dashboard routes
    // Don't redirect login page on error to prevent loops
    console.error('Middleware: Supabase client error:', error)
    
    if (pathname.startsWith('/dashboard')) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
    
    // For other errors, just continue (don't redirect login page)
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

