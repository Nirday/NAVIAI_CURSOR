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
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Handle authentication errors
    if (authError || !user) {
      // Clear invalid session cookies (Supabase SSR uses these cookie names)
      // Note: Supabase SSR manages cookies internally, but we clear them on error
      const supabaseCookieNames = [
        `sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token`,
        `sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token.0`,
        `sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token.1`,
      ]
      
      // Clear all possible Supabase cookie variations
      request.cookies.getAll().forEach(cookie => {
        if (cookie.name.includes('sb-') && cookie.name.includes('auth-token')) {
          response.cookies.delete(cookie.name)
        }
      })
      
      // If on dashboard route and no session, redirect to login
      if (pathname.startsWith('/dashboard')) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirected', 'true')
        return NextResponse.redirect(loginUrl)
      }
      
      // For other protected routes (not login), also redirect to login
      if (pathname !== '/login' && !pathname.startsWith('/api/')) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirected', 'true')
        return NextResponse.redirect(loginUrl)
      }
      
      return response
    }
    
    // User is authenticated
    // If on login page and has valid session, redirect to dashboard
    if (pathname === '/login') {
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
    
  } catch (error) {
    // If Supabase client creation fails, clear cookies and redirect to login
    console.error('Middleware: Supabase client error:', error)
    
    // Clear cookies on error
    response.cookies.delete('sb-access-token')
    response.cookies.delete('sb-refresh-token')
    
    // If on dashboard route, redirect to login
    if (pathname.startsWith('/dashboard')) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
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

