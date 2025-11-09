"use client"

import React, { useEffect, useState } from 'react'
import { SocialConnection, SocialPost } from '@/libs/social-hub/src/types'
import { BusinessProfile } from '@/libs/chat-core/src/types'
import { CheckCircleIcon, XCircleIcon, PlusIcon } from '@heroicons/react/24/outline'
import PostComposer from './PostComposer'
import ContentCalendar from './ContentCalendar'
import SocialIdeas from './SocialIdeas'
import UnifiedInbox from './UnifiedInbox'
import { SocialIdea } from '@/libs/social-hub/src/types'

interface SocialHubDashboardProps {
  userId: string
  className?: string
}

type Tab = 'calendar' | 'inbox' | 'analytics' | 'connections'

export default function SocialHubDashboard({ userId, className = '' }: SocialHubDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('calendar')
  const [connections, setConnections] = useState<SocialConnection[]>([])
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [showComposer, setShowComposer] = useState(false)
  const [selectedIdea, setSelectedIdea] = useState<SocialIdea | null>(null)
  const [loading, setLoading] = useState(true)
  const [connectionMessage, setConnectionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchData()
    
    // Check for OAuth callback messages in URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const success = params.get('success')
      const error = params.get('error')
      
      if (success) {
        setConnectionMessage({ type: 'success', text: `Successfully connected to ${success}!` })
        setActiveTab('connections')
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname)
        // Refresh connections
        fetchConnections()
      }
      
      if (error) {
        setConnectionMessage({ type: 'error', text: decodeURIComponent(error) })
        setActiveTab('connections')
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [userId])

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchConnections(),
        fetchPosts(),
        fetchProfile()
      ])
    } finally {
      setLoading(false)
    }
  }

  const fetchConnections = async () => {
    try {
      const res = await fetch('/api/social/connections', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const json = await res.json()
        setConnections(json.connections || [])
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error)
    }
  }

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/social/posts', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const json = await res.json()
        setPosts(json.posts || [])
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    }
  }

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const json = await res.json()
        setProfile(json.profile)
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    }
  }

  const handleConnectPlatform = async (platform: string) => {
    // Redirect to OAuth initiation endpoint
    const oauthUrl = `/api/social/oauth/initiate?platform=${platform}&userId=${userId}`
    window.location.href = oauthUrl
  }

  if (loading) {
    return (
      <div className={`rounded-lg border bg-white p-6 ${className}`}>
        <div className="text-center text-gray-500">Loading social dashboard...</div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">Social Media Growth Hub</h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'calendar'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'inbox'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Inbox
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'connections'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Connections
          </button>
        </nav>
      </div>

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="p-6 space-y-6">
          {showComposer ? (
            <PostComposer
              userId={userId}
              profile={profile}
              prefillContent={selectedIdea?.contentText}
              prefillImageSuggestion={selectedIdea?.imageSuggestion}
              onPostSaved={() => {
                setShowComposer(false)
                setSelectedIdea(null)
                fetchPosts()
              }}
              onCancel={() => {
                setShowComposer(false)
                setSelectedIdea(null)
              }}
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Content Calendar</h3>
                <button
                  onClick={() => setShowComposer(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  + Create Post
                </button>
              </div>
              
              {/* Two-column layout: Ideas sidebar + Calendar */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Ideas Section */}
                <div className="lg:col-span-1">
                  <SocialIdeas
                    userId={userId}
                    onUseIdea={(idea) => {
                      // Pre-fill composer with idea content
                      setShowComposer(true)
                      // Store idea for composer to use
                      setSelectedIdea(idea)
                    }}
                  />
                </div>
                
                {/* Calendar Section */}
                <div className="lg:col-span-2">
                  <ContentCalendar
                    userId={userId}
                    posts={posts}
                    onPostClick={(post) => {
                      // Handle post click - could show details modal
                      console.log('Post clicked:', post)
                    }}
                    onRefresh={fetchPosts}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Inbox Tab */}
      {activeTab === 'inbox' && (
        <div className="h-[calc(100vh-200px)]">
          <UnifiedInbox userId={userId} />
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="p-6">
          <AnalyticsTabPlaceholder />
        </div>
      )}

      {/* Connections Tab */}
      {activeTab === 'connections' && (
        <div className="p-6">
          {connectionMessage && (
            <div className={`mb-4 p-4 rounded-lg ${
              connectionMessage.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{connectionMessage.text}</p>
                <button
                  onClick={() => setConnectionMessage(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          <ConnectionsTab
            connections={connections}
            onConnectPlatform={handleConnectPlatform}
            onRefresh={fetchConnections}
          />
        </div>
      )}
    </div>
  )
}


// Inbox Tab Placeholder
function InboxTabPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-gray-100 p-4 mb-4">
        <svg
          className="h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Unified Inbox</h3>
      <p className="text-gray-500 max-w-md">
        The unified inbox will be available after implementing the Inbound Engine (Task 5.6) and 
        Unified Inbox UI (Task 5.7). This will show conversations from all connected platforms 
        with AI reply suggestions.
      </p>
    </div>
  )
}

// Analytics Tab Placeholder
function AnalyticsTabPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-gray-100 p-4 mb-4">
        <svg
          className="h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics & Performance</h3>
      <p className="text-gray-500 max-w-md">
        Analytics will be available after implementing the Publishing & Business Analytics Engine (Task 5.5).
        This will show engagement metrics, website clicks, and performance insights across all platforms.
      </p>
    </div>
  )
}

// Connections Tab Component
function ConnectionsTab({
  connections,
  onConnectPlatform,
  onRefresh
}: {
  connections: SocialConnection[]
  onConnectPlatform: (platform: string) => void
  onRefresh: () => void
}) {
  const platforms: Array<{
    id: 'facebook' | 'linkedin' | 'instagram' | 'twitter'
    name: string
    icon: string
  }> = [
    { id: 'facebook', name: 'Facebook', icon: '📘' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
    { id: 'instagram', name: 'Instagram', icon: '📷' },
    { id: 'twitter', name: 'Twitter/X', icon: '🐦' }
  ]

  const getConnectionForPlatform = (platform: string) => {
    return connections.find(c => c.platform === platform && c.isActive)
  }

  const isConnectionExpired = (connection: SocialConnection) => {
    if (!connection.tokenExpiresAt) return false
    return new Date(connection.tokenExpiresAt) < new Date()
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connected Accounts</h3>
        <p className="text-sm text-gray-500">
          Manage your social media account connections. Connect accounts to schedule posts, monitor conversations, and track analytics.
        </p>
      </div>

      {/* Connected Accounts List */}
      {connections.length > 0 && (
        <div className="mb-8">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Active Connections</h4>
          <div className="space-y-3">
            {connections.map((connection) => {
              const isExpired = isConnectionExpired(connection)
              const status = isExpired ? 'expired' : connection.isActive ? 'active' : 'inactive'
              
              return (
                <div
                  key={connection.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                      {/* Status Indicator */}
                      {status === 'active' ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900 capitalize">
                            {connection.platform}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({connection.platformUsername})
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Status: <span className="capitalize">{status}</span>
                          {isExpired && connection.tokenExpiresAt && (
                            <span className="ml-2">
                              (Expired {new Date(connection.tokenExpiresAt).toLocaleDateString()})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Connected {new Date(connection.createdAt).toLocaleDateString()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Platform Connection Buttons */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          {connections.length > 0 ? 'Connect Additional Platforms' : 'Connect Your First Platform'}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platforms.map((platform) => {
            const existingConnection = getConnectionForPlatform(platform.id)
            const isConnected = !!existingConnection

            return (
              <div
                key={platform.id}
                className={`relative p-4 border-2 rounded-lg transition-colors ${
                  isConnected
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{platform.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900">{platform.name}</div>
                      {isConnected && (
                        <div className="text-xs text-green-600 mt-1">
                          Connected as {existingConnection.platformUsername}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onConnectPlatform(platform.id)}
                    disabled={isConnected}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isConnected
                        ? 'bg-green-100 text-green-700 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isConnected ? (
                      <>
                        <CheckCircleIcon className="h-4 w-4" />
                        <span>Connected</span>
                      </>
                    ) : (
                      <>
                        <PlusIcon className="h-4 w-4" />
                        <span>Connect</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> OAuth connection flow will be fully implemented in Task 5.5. 
          Currently, you can see the connection interface, but actual platform connections require the OAuth implementation.
        </p>
      </div>
    </div>
  )
}

