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
    let isMounted = true
    
    const checkAuthAndProfile = async () => {
      try {
        // Don't check auth here - middleware handles it
        // Just check for profile to determine what to show
        if (!isMounted) return
        
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          // Middleware should have redirected, but if we're here, just wait
          // Don't redirect to prevent loops
          return
        }
        
        const userId = session.user.id
        if (isMounted) {
          setUserId(userId)
        }

        // Check if user has a business profile (API uses cookie-based auth, no header needed)
        try {
          const response = await fetch('/api/profile', {
            cache: 'no-store' // Prevent caching issues
          })
          
          if (!isMounted) return
          
          if (response.ok) {
            const data = await response.json()
            if (data.profile) {
              setHasProfile(true)
            } else {
              setHasProfile(false)
            }
          } else if (response.status === 404) {
            setHasProfile(false)
          } else if (response.status === 401) {
            // Unauthorized - middleware should handle redirect, don't redirect here to prevent loops
            // Just set hasProfile to false
            setHasProfile(false)
            return
          } else {
            // On error, assume no profile and show onboarding
            console.warn('Profile check returned status:', response.status)
            setHasProfile(false)
          }
        } catch (error) {
          if (!isMounted) return
          console.error('Error checking profile:', error)
          setHasProfile(false)
        }
      } catch (error) {
        if (!isMounted) return
        console.error('Auth error:', error)
        router.push('/login')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    checkAuthAndProfile()
    
    return () => {
      isMounted = false
    }
  }, [router])

  if (loading || hasProfile === null) {
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

  if (!userId) {
    return null
  }

  // Show onboarding chat for first-time users
  if (!hasProfile) {
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

  // Show regular chat for users with profiles
  return (
    <div className="h-full flex flex-col relative">
      {/* Fun header */}
      <div className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-white px-8 py-6 rounded-b-3xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="text-4xl animate-bounce" style={{ animationDuration: '2s' }}>💬</div>
          <div>
            <h1 className="text-3xl font-bold">Chat with Navi AI</h1>
            <p className="text-white/90 mt-1">
              Ask me anything about growing your business, managing your website, or improving your online presence! ✨
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden bg-white/80 backdrop-blur-sm rounded-t-3xl -mt-4 relative z-10 shadow-lg">
        <ChatInterface userId={userId} />
      </div>
    </div>
  )
}

