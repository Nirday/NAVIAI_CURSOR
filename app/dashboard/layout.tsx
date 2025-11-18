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
  
  // Get the current URL from headers to check if we're on an onboarding route
  const headersList = await headers()
  const url = headersList.get('x-url') || headersList.get('referer') || ''
  const isOnboardingRoute = url.includes('/dashboard/onboarding')

  // Create Supabase client for server-side auth
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  const { data: { session } } = await supabase.auth.getSession()

  // If no session, redirect to login
  if (!session) {
    redirect('/login')
  }

  // 2. CHECK FOR A BUSINESS PROFILE (THE "GATEKEEPER" LOGIC)
  // Skip profile check for onboarding routes - users need to access onboarding to create a profile
  if (!isOnboardingRoute) {
    const { data: profile, error } = await supabase
      .from('business_profiles')
      .select('id') // Just check for existence
      .eq('user_id', session.user.id)
      .single()

    // 3. REDIRECT IF ONBOARDING IS INCOMPLETE
    // We check if a profile exists. If not, we MUST redirect to onboarding.
    // Note: error.code === 'PGRST116' means no rows found, which is expected for new users
    if (error || !profile) {
      // This is the core fix: force user to onboarding
      redirect('/dashboard/onboarding/start')
    }
  }

  // --- If they have a session AND a profile, they can see the dashboard ---

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Persistent sidebar component */}
      <DashboardSidebar />

      {/* Main page content (e.g., website editor, analytics) */}
      <main className="flex-1 overflow-y-auto ml-64">
        {children}
      </main>
    </div>
  )
}

