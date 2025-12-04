import React from 'react'
import DashboardSidebar from '@/apps/dashboard/components/DashboardSidebar'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get cookies for server-side session
  const cookieStore = await cookies()
  
  // Get the current pathname from headers to check if we're on an onboarding route
  // Middleware sets x-pathname header for reliable route detection
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  const referer = headersList.get('referer') || ''
  
  // Extract pathname from referer as fallback
  let pathnameFromReferer = ''
  if (referer) {
    try {
      const url = new URL(referer)
      pathnameFromReferer = url.pathname
    } catch {
      // If referer is not a full URL, check if it contains the path
      if (referer.includes('/dashboard/onboarding')) {
        pathnameFromReferer = referer
      }
    }
  }
  
  // Check if we're on an onboarding route (use pathname from middleware, fallback to referer)
  const isOnboardingRoute = pathname.includes('/dashboard/onboarding') || 
                            pathnameFromReferer.includes('/dashboard/onboarding')

  // Check if we're in mock mode
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' || 
                     !supabaseUrl || 
                     !supabaseAnonKey ||
                     supabaseUrl === 'http://localhost:54321' ||
                     supabaseAnonKey === 'mock-key'

  // In mock mode, skip server-side auth check (sessions are client-side only)
  // The client-side will handle redirects if needed
  if (!isMockMode) {
    try {
      // Create Supabase client for server-side auth (only in real mode)
      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                )
              } catch {
                // The `setAll` method was called from a Server Component.
                // This can be ignored if you have middleware refreshing
                // user sessions.
              }
            },
          },
        }
      )

      // 1. Get the user's session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      // If no session or session error, redirect to login
      if (sessionError || !session) {
        redirect('/login')
      }

      // 2. CHECK FOR A BUSINESS PROFILE (THE "GATEKEEPER" LOGIC)
      // First check if we're already on an onboarding route - if so, skip the profile check
      // This prevents redirect loops when users are already on the onboarding page
      const { data: profile, error } = await supabase
        .from('business_profiles')
        .select('id') // Just check for existence
        .eq('user_id', session.user.id)
        .single()

      // 3. REDIRECT IF ONBOARDING IS INCOMPLETE
      // We check if a profile exists. If not, we MUST redirect to onboarding.
      // Note: error.code === 'PGRST116' means no rows found, which is expected for new users
      // BUT: Only redirect if we're NOT already on an onboarding route (to prevent loops)
      if ((error || !profile) && !isOnboardingRoute) {
        // This is the core fix: force user to onboarding
        redirect('/dashboard/onboarding/start')
      }
    } catch (error) {
      // If there's an error checking session/profile, log it but don't crash
      // The client-side will handle redirects if needed
      console.error('Dashboard layout auth check error:', error)
      // In case of error, let the client-side handle it
    }
  }

  // --- If they have a session AND a profile, they can see the dashboard ---

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-200 rounded-full opacity-30 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-200 rounded-full opacity-30 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-200 rounded-full opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Persistent sidebar component */}
      <DashboardSidebar />

      {/* Main page content (e.g., website editor, analytics) */}
      <main className="flex-1 overflow-y-auto ml-72 relative z-10">
        {children}
      </main>
    </div>
  )
}

