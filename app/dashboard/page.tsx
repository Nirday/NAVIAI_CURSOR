'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/**
 * Dashboard Home Page
 * Redirects authenticated users to the main dashboard view
 */
export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    // Check authentication and redirect to a default dashboard section
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      // Not authenticated, redirect to login
      router.push('/login')
      return
    }

    // Authenticated - redirect to a default dashboard section (e.g., website)
    // You can change this to any default page you prefer
    router.push('/dashboard/website')
  }

  // Show loading state while checking auth
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  )
}

