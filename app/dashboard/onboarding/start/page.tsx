'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import OnboardingChatInterface from '@/apps/dashboard/components/OnboardingChatInterface'
import { supabase } from '@/lib/supabase'

/**
 * Onboarding Start Page
 * This is where new users without a business profile are directed
 * Uses specialized onboarding chat that proactively asks questions
 */
export default function OnboardingStartPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
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
        <h1 className="text-3xl font-bold mb-2">Welcome to Navi AI!</h1>
        <p className="text-blue-100 text-lg">
          Let's get to know your business. I'll ask you a few quick questions to set everything up.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <OnboardingChatInterface userId={userId} />
      </div>
    </div>
  )
}

