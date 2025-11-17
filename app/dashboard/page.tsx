'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/**
 * Dashboard Home Page
 * Redirects authenticated users to the main dashboard view
 * If user doesn't have a website yet, redirects to template selector
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

    // Check if user has a website
    try {
      const res = await fetch('/api/website/me', {
        headers: { 'x-user-id': session.user.id }
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.website) {
          // User has a website, go to website editor
          router.push('/dashboard/website')
        } else {
          // User doesn't have a website yet, redirect to template selector
          router.push('/dashboard/onboarding/template')
        }
      } else {
        // If API call fails, assume no website and redirect to template selector
        router.push('/dashboard/onboarding/template')
      }
    } catch (error) {
      console.error('Error checking website:', error)
      // On error, redirect to template selector
      router.push('/dashboard/onboarding/template')
    }
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

