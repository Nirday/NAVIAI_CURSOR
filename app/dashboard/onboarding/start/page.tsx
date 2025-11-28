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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-bounce text-6xl mb-4">🤖</div>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Colorful header with waves */}
      <div className="relative bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white px-8 py-10 rounded-b-3xl shadow-xl overflow-hidden">
        {/* Animated waves */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg className="w-full h-12" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,60 Q300,20 600,60 T1200,60 L1200,120 L0,120 Z" fill="rgba(255,255,255,0.1)" className="animate-pulse"></path>
          </svg>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="text-5xl animate-bounce" style={{ animationDuration: '2s' }}>👋</div>
            <h1 className="text-4xl font-bold">Hey there!</h1>
          </div>
          <p className="text-white/90 text-lg max-w-2xl">
            I'm Navi, your friendly AI assistant! Let's chat for a bit so I can learn about your business and help you grow. 🚀
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden bg-white/80 backdrop-blur-sm rounded-t-3xl -mt-4 relative z-10 shadow-lg">
        <OnboardingChatInterface userId={userId} />
      </div>
    </div>
  )
}

