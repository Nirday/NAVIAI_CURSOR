"use client"

import React, { useEffect, useState } from 'react'
import { ContentSettings, BlogPost, RepurposedAsset } from '@/libs/content-engine/src/types'

interface ContentDashboardProps {
  userId: string
  className?: string
}

type Tab = 'content' | 'settings'

export default function ContentDashboard({ userId, className = '' }: ContentDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('content')
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
  const [settings, setSettings] = useState<ContentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPosts()
    fetchSettings()
  }, [userId])

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/content/posts', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const json = await res.json()
        setPosts(json.posts || [])
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/content/settings', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const json = await res.json()
        setSettings(json.settings)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }
  }

  const fetchPostDetail = async (postId: string) => {
    try {
      const res = await fetch(`/api/content/posts/${postId}`, {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const json = await res.json()
        setSelectedPost(json.post)
      }
    } catch (error) {
      console.error('Failed to fetch post detail:', error)
    }
  }

  const handleSaveSettings = async () => {
    if (!settings) return
    
    setSaving(true)
    try {
      const res = await fetch('/api/content/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify(settings)
      })
      if (res.ok) {
        // Update Master Business Profile with content strategy insights
        const { updateBusinessProfile } = await import('../utils/profile-updates')
        
        const updates: any = {}
        
        // Update target audience if defined in content settings
        if (settings.targetPlatforms && settings.targetPlatforms.length > 0) {
          // This gives us insight into who they're targeting
          updates.customAttributes = [
            {
              label: 'Content Target Platforms',
              value: settings.targetPlatforms.join(', ')
            }
          ]
        }
        
        if (settings.primaryBusinessGoalCta) {
          updates.customAttributes = [
            ...(updates.customAttributes || []),
            {
              label: 'Primary Business Goal CTA',
              value: settings.primaryBusinessGoalCta
            }
          ]
        }
        
        if (Object.keys(updates).length > 0) {
          await updateBusinessProfile(userId, updates)
        }
        
        alert('Settings saved successfully!')
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleResendApproval = async (postId: string) => {
    if (!confirm('Resend approval notification?')) return

    try {
      const res = await fetch('/api/content/resend-approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ postId })
      })
      if (res.ok) {
        alert('Approval notification resent successfully!')
      } else {
        throw new Error('Failed to resend approval')
      }
    } catch (error) {
      console.error('Failed to resend approval:', error)
      alert('Failed to resend approval. Please try again.')
    }
  }

  const getStatusBadge = (status: string, scheduledAt: string | Date | null) => {
    const statusColors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      pending_approval: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      changes_requested: 'bg-orange-100 text-orange-800',
      published: 'bg-green-100 text-green-800'
    }

    const statusLabels: Record<string, string> = {
      draft: 'Draft',
      scheduled: 'Scheduled',
      pending_approval: 'Pending Approval',
      approved: 'Approved',
      changes_requested: 'Changes Requested',
      published: 'Published'
    }

    let label = statusLabels[status] || status
    if ((status === 'pending_approval' || status === 'approved') && scheduledAt) {
      const date = scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt)
      const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      label = `${statusLabels[status]} - Scheduled for ${formattedDate}`
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {label}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className={`rounded-lg border bg-white p-6 ${className}`}>
        <div className="text-sm text-gray-500">Loading content...</div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border bg-white ${className}`}>
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => {
              setActiveTab('content')
              setSelectedPost(null)
            }}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'content'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            My Content
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'settings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Settings
          </button>
        </nav>
      </div>

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="p-6">
          {selectedPost ? (
            <PostDetailView
              post={selectedPost}
              onBack={() => setSelectedPost(null)}
              onResendApproval={handleResendApproval}
            />
          ) : (
            <PostListView
              posts={posts}
              onPostClick={(post) => {
                fetchPostDetail(post.id)
                setSelectedPost(post)
              }}
              getStatusBadge={getStatusBadge}
              formatDate={formatDate}
            />
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && settings && (
        <ContentSettingsView
          settings={settings}
          onSettingsChange={setSettings}
          onSave={handleSaveSettings}
          saving={saving}
        />
      )}
    </div>
  )
}

function PostListView({
  posts,
  onPostClick,
  getStatusBadge,
  formatDate
}: {
  posts: BlogPost[]
  onPostClick: (post: BlogPost) => void
  getStatusBadge: (status: string, scheduledAt: string | null) => React.ReactElement
  formatDate: (date: string) => string
}) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No blog posts yet.</p>
        <p className="text-sm text-gray-400">
          Enable Content Autopilot in Settings to start generating content automatically.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Blog Posts</h2>
      <div className="space-y-4">
        {posts.map((post) => (
          <div
            key={post.id}
            onClick={() => onPostClick(post)}
            className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-2">{post.title}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{getStatusBadge(post.status, post.scheduledAt ? (post.scheduledAt instanceof Date ? post.scheduledAt.toISOString() : post.scheduledAt) : null)}</span>
                  {post.focusKeyword && (
                    <span>Keyword: {post.focusKeyword}</span>
                  )}
                  <span>Created: {formatDate(typeof post.createdAt === 'string' ? post.createdAt : post.createdAt.toISOString())}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PostDetailView({
  post,
  onBack,
  onResendApproval
}: {
  post: BlogPost
  onBack: () => void
  onResendApproval: (postId: string) => void
}) {
  const [activePlatformTab, setActivePlatformTab] = useState<string | null>(
    post.repurposedAssets && post.repurposedAssets.length > 0 ? post.repurposedAssets[0].platform : null
  )

  const getCharacterCount = (text: string) => text.length
  const getTwitterCharacterCount = (text: string) => {
    // Rough estimate - URLs count as 23 chars in Twitter
    const urlPattern = /https?:\/\/[^\s]+/g
    const urls = text.match(urlPattern) || []
    const urlCount = urls.length * 23
    const textLength = text.replace(urlPattern, '').length
    return textLength + urlCount
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Posts
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{post.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>Status: {post.status}</span>
          {post.focusKeyword && <span>Keyword: {post.focusKeyword}</span>}
          {post.scheduledAt && (
            <span>Scheduled: {new Date(post.scheduledAt).toLocaleString()}</span>
          )}
        </div>
      </div>

      {post.status === 'pending_approval' && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">
                This post is pending your approval
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Check your email or SMS for the approval link
              </p>
            </div>
            <button
              onClick={() => onResendApproval(post.id)}
              className="px-4 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
            >
              Resend Approval Notification
            </button>
          </div>
        </div>
      )}

      {post.brandedGraphicUrl && (
        <div className="mb-6">
          <img
            src={post.brandedGraphicUrl}
            alt={post.title}
            className="w-full rounded-lg border"
          />
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Blog Post Content</h2>
        <div className="prose max-w-none border rounded-lg p-6 bg-gray-50">
          <div className="whitespace-pre-wrap font-sans text-sm text-gray-700">
            {post.contentMarkdown}
          </div>
        </div>
      </div>

      {post.repurposedAssets && post.repurposedAssets.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Social Media Assets</h2>
          
          {/* Platform Tabs */}
          <div className="border-b border-gray-200 mb-4">
            <nav className="flex -mb-px space-x-4">
              {post.repurposedAssets.map((asset) => (
                <button
                  key={asset.platform}
                  onClick={() => setActivePlatformTab(asset.platform)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${
                    activePlatformTab === asset.platform
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {asset.platform.charAt(0).toUpperCase() + asset.platform.slice(1)}
                  {asset.platform === 'twitter' && (
                    <span className="ml-2 text-xs text-gray-400">
                      ({getTwitterCharacterCount(asset.content)} chars)
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Active Platform Content */}
          {activePlatformTab && (
            <div className="border rounded-lg p-6 bg-gray-50">
              {post.repurposedAssets
                .filter((asset) => asset.platform === activePlatformTab)
                .map((asset) => (
                  <div key={asset.platform}>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">
                        {asset.platform.charAt(0).toUpperCase() + asset.platform.slice(1)} Post
                      </h3>
                      <span className="text-xs text-gray-500">
                        {asset.platform === 'twitter'
                          ? `${getTwitterCharacterCount(asset.content)} characters`
                          : `${getCharacterCount(asset.content)} characters`}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap text-sm text-gray-700">
                      {asset.content}
                    </div>
                    {asset.imageUrl && (
                      <div className="mt-4">
                        <img
                          src={asset.imageUrl}
                          alt={`${asset.platform} image`}
                          className="max-w-md rounded border"
                        />
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ContentSettingsView({
  settings,
  onSettingsChange,
  onSave,
  saving
}: {
  settings: ContentSettings
  onSettingsChange: (settings: ContentSettings) => void
  onSave: () => void
  saving: boolean
}) {
  const platforms: Array<'linkedin' | 'facebook' | 'twitter' | 'instagram'> = [
    'linkedin',
    'facebook',
    'twitter',
    'instagram'
  ]

  const frequencies: Array<'daily' | 'weekly' | 'biweekly' | 'monthly'> = [
    'daily',
    'weekly',
    'biweekly',
    'monthly'
  ]

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-6">Content Autopilot Settings</h2>

      <div className="space-y-6 max-w-2xl">
        {/* Enable/Disable */}
        <div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.isEnabled}
              onChange={(e) =>
                onSettingsChange({ ...settings, isEnabled: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-900">
              Enable Content Autopilot
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-7">
            When enabled, Navi AI will automatically generate blog posts based on your frequency setting.
          </p>
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Publishing Frequency
          </label>
          <select
            value={settings.frequency}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                frequency: e.target.value as ContentSettings['frequency']
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {frequencies.map((freq) => (
              <option key={freq} value={freq}>
                {freq.charAt(0).toUpperCase() + freq.slice(1)}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            How often should we generate new blog posts?
          </p>
        </div>

        {/* Target Platforms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Platforms
          </label>
          <div className="space-y-2">
            {platforms.map((platform) => (
              <label key={platform} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.targetPlatforms.includes(platform)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSettingsChange({
                        ...settings,
                        targetPlatforms: [...settings.targetPlatforms, platform]
                      })
                    } else {
                      onSettingsChange({
                        ...settings,
                        targetPlatforms: settings.targetPlatforms.filter((p) => p !== platform)
                      })
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  {platform === 'twitter' && '/X'}
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Select which social media platforms to generate content for.
          </p>
        </div>

        {/* Primary Business Goal CTA */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary Business Goal CTA
          </label>
          <input
            type="text"
            value={settings.primaryBusinessGoalCta || ''}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                primaryBusinessGoalCta: e.target.value || null
              })
            }
            placeholder="Call now for a free estimate!"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Examples: "Book a free consultation", "Get your 24/7 emergency quote", "Schedule your service today"
          </p>
          <p className="text-xs text-gray-400 mt-1">
            This CTA will be naturally embedded in your blog posts. Use your own business language.
          </p>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

