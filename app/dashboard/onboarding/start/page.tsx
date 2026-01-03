'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import OnboardingChatInterface from '@/apps/dashboard/components/OnboardingChatInterface'
import { supabase } from '@/lib/supabase'

// Check mock mode at module level
const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' ||
                   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                   !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Onboarding Start Page
 * This is where new users without a business profile are directed
 * Uses specialized onboarding chat that proactively asks questions
 */
export default function OnboardingStartPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // In mock mode, skip auth check entirely
    if (isMockMode) {
      setUserId('mock-user-123')
      return
    }

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUserId(session.user.id)
    }
    checkAuth()
  }, [router])

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-8 border-b border-blue-800">
        <h1 className="text-3xl font-bold mb-2">Hey there! 👋</h1>
        <p className="text-blue-100 text-lg">
          I'm Navi, and I'm here to help you get set up. We'll just chat for a bit so I can learn about your business.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <OnboardingChatInterface userId={userId} />
      </div>
    </div>
  )
}

