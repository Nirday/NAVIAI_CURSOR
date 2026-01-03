import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware - MOCK MODE
 * Just sets x-pathname header, no auth checks
 * TODO: Re-enable auth when Supabase is configured
 */
export async function middleware(request: NextRequest) {
  // Set a header with the pathname so layouts can detect the current route
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)
  
  // MOCK MODE: Just pass through, no auth checks
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
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

