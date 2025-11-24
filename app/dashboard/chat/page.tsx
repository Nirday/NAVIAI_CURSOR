'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ChatInterface from '@/apps/dashboard/components/ChatInterface'
import { supabase } from '@/lib/supabase'

/**
 * Chat Page
 * Main chat interface for users to interact with Navi AI
 */
export default function ChatPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }
        setUserId(session.user.id)
      } catch (error) {
        console.error('Auth error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    )
  }

  if (!userId) {
    return null
  }

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

