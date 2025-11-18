'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ChatInterface from '@/apps/dashboard/components/ChatInterface'
import { supabase } from '@/lib/supabase'

/**
 * Onboarding Start Page
 * This is where new users without a business profile are directed
 * They can use the chat interface to complete onboarding
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
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome to Navi AI!</h1>
        <p className="text-gray-600 mt-2">
          Let's get started by setting up your business profile. You can chat with me below to begin.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatInterface userId={userId} />
      </div>
    </div>
  )
}

