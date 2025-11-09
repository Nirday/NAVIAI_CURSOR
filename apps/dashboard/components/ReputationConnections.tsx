"use client"

import React, { useState, useEffect } from 'react'
import { ReviewSource } from '@/libs/reputation-hub/src/types'
import { CheckCircleIcon, XCircleIcon, PlusIcon } from '@heroicons/react/24/outline'

interface ReputationConnectionsProps {
  userId: string
  className?: string
}

export default function ReputationConnections({
  userId,
  className = ''
}: ReputationConnectionsProps) {
  const [sources, setSources] = useState<ReviewSource[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showYelpModal, setShowYelpModal] = useState(false)
  const [yelpApiKey, setYelpApiKey] = useState('')
  const [yelpBusinessName, setYelpBusinessName] = useState('')

  useEffect(() => {
    fetchSources()
    
    // Check for OAuth callback messages in URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const success = params.get('success')
      const error = params.get('error')
      
      if (success) {
        setMessage({ type: 'success', text: `Successfully connected to ${success}!` })
        fetchSources()
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname)
      }
      
      if (error) {
        setMessage({ type: 'error', text: decodeURIComponent(error) })
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [userId])

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/reputation/sources', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const json = await res.json()
        setSources(json.sources || [])
      }
    } catch (error) {
      console.error('Failed to fetch review sources:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectPlatform = async (platform: 'google' | 'facebook' | 'yelp') => {
    if (platform === 'yelp') {
      // Show Yelp API key entry modal
      setShowYelpModal(true)
      return
    }

    // Redirect to OAuth initiation endpoint
    const oauthUrl = `/api/reputation/oauth/initiate?platform=${platform}&userId=${userId}`
    window.location.href = oauthUrl
  }

  const handleYelpSubmit = async () => {
    if (!yelpApiKey || !yelpBusinessName) {
      setMessage({ type: 'error', text: 'Please enter both API key and business name' })
      return
    }

    try {
      const res = await fetch('/api/reputation/sources', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          platform: 'yelp',
          platformAccountId: yelpApiKey, // Using API key as account ID for Yelp
          platformAccountName: yelpBusinessName,
          reviewLink: null // Yelp review links are typically manual
        })
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Yelp connection added successfully!' })
        setShowYelpModal(false)
        setYelpApiKey('')
        setYelpBusinessName('')
        fetchSources()
      } else {
        const error = await res.json()
        setMessage({ type: 'error', text: error.error || 'Failed to add Yelp connection' })
      }
    } catch (error: any) {
      console.error('Error adding Yelp connection:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to add Yelp connection' })
    }
  }

  const handleDisconnect = async (sourceId: string) => {
    if (!confirm('Are you sure you want to disconnect this review source?')) {
      return
    }

    try {
      const res = await fetch(`/api/reputation/sources/${sourceId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId }
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Review source disconnected successfully' })
        fetchSources()
      } else {
        const error = await res.json()
        setMessage({ type: 'error', text: error.error || 'Failed to disconnect' })
      }
    } catch (error: any) {
      console.error('Error disconnecting source:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to disconnect' })
    }
  }

  const getSourceForPlatform = (platform: string) => {
    return sources.find(s => s.platform === platform && s.isActive)
  }

  const isTokenExpired = (source: ReviewSource) => {
    if (!source.tokenExpiresAt) return false
    return new Date(source.tokenExpiresAt) < new Date()
  }

  const platforms: Array<{
    id: 'google' | 'yelp' | 'facebook'
    name: string
    icon: string
    description: string
  }> = [
    { id: 'google', name: 'Google Business Profile', icon: '🔍', description: 'Connect your Google Business Profile to fetch and respond to reviews' },
    { id: 'yelp', name: 'Yelp', icon: '⭐', description: 'Add your Yelp API key to fetch reviews' },
    { id: 'facebook', name: 'Facebook', icon: '📘', description: 'Connect your Facebook Page to fetch and respond to reviews' }
  ]

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">Loading connections...</div>
      </div>
    )
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Review Source Connections</h3>
        <p className="text-sm text-gray-500">
          Connect your review platforms to automatically fetch reviews and manage responses.
        </p>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{message.text}</p>
            <button
              onClick={() => setMessage(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Connected Sources */}
      {sources.length > 0 && (
        <div className="mb-8">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Active Connections</h4>
          <div className="space-y-3">
            {sources.map((source) => {
              const isExpired = isTokenExpired(source)
              
              return (
                <div
                  key={source.id}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">
                      {platforms.find(p => p.id === source.platform)?.icon || '📝'}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h5 className="font-medium text-gray-900">
                          {source.platformAccountName}
                        </h5>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          source.isActive && !isExpired
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {isExpired ? 'Expired' : source.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 capitalize">{source.platform}</p>
                      {source.reviewLink && (
                        <a
                          href={source.reviewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View Review Page →
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDisconnect(source.id)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded-md"
                  >
                    Disconnect
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Platform Connection Options */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Connect New Platform</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {platforms.map((platform) => {
            const existingSource = getSourceForPlatform(platform.id)
            const isConnected = !!existingSource

            return (
              <div
                key={platform.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{platform.icon}</span>
                    <h5 className="font-medium text-gray-900">{platform.name}</h5>
                  </div>
                  {isConnected && (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-4">{platform.description}</p>
                <button
                  onClick={() => handleConnectPlatform(platform.id)}
                  disabled={isConnected}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
            )
          })}
        </div>
      </div>

      {/* Yelp API Key Modal */}
      {showYelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Yelp Connection</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yelp API Key
                </label>
                <input
                  type="text"
                  value={yelpApiKey}
                  onChange={(e) => setYelpApiKey(e.target.value)}
                  placeholder="Enter your Yelp API key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={yelpBusinessName}
                  onChange={(e) => setYelpBusinessName(e.target.value)}
                  placeholder="Enter your business name on Yelp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowYelpModal(false)
                  setYelpApiKey('')
                  setYelpBusinessName('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleYelpSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

