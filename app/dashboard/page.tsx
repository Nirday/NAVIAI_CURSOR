'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ChatInterface from '@/apps/dashboard/components/ChatInterface'
import OnboardingChatInterface from '@/apps/dashboard/components/OnboardingChatInterface'
import { supabase } from '@/lib/supabase'

/**
 * Dashboard Home Page
 * Shows onboarding chat for first-time users, regular chat for existing users
 */
export default function DashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [hasProfile, setHasProfile] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuthAndProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }
        
        const userId = session.user.id
        setUserId(userId)

        // Check if user has a business profile
        try {
          const response = await fetch('/api/profile', {
            headers: {
              'x-user-id': userId
            }
          })
          
          if (response.ok) {
            setHasProfile(true)
          } else if (response.status === 404) {
            setHasProfile(false)
          } else {
            // On error, assume no profile and show onboarding
            setHasProfile(false)
          }
        } catch (error) {
          console.error('Error checking profile:', error)
          setHasProfile(false)
        }
      } catch (error) {
        console.error('Auth error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    checkAuthAndProfile()
  }, [router])

  if (loading || hasProfile === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!userId) {
    return null
  }

  // Show onboarding chat for first-time users
  if (!hasProfile) {
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

  // Show regular chat for users with profiles
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Chat with Navi AI</h1>
        <p className="text-gray-600 mt-1 text-sm">
          Ask me anything about growing your business, managing your website, or improving your online presence.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatInterface userId={userId} />
      </div>
    </div>
  )
}

