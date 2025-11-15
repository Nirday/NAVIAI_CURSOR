"use client"

import React, { useState, useEffect } from 'react'
import { SocialPlatform, PLATFORM_LIMITS, getOptimalTimingSuggestion } from '@/libs/social-hub/src/adapter'
import { BusinessProfile } from '@/libs/chat-core/src/types'
import { ExclamationTriangleIcon, SparklesIcon } from '@heroicons/react/24/outline'

interface PostComposerProps {
  userId: string
  profile: BusinessProfile | null
  onPostSaved?: () => void
  onCancel?: () => void
  prefillContent?: string
  prefillImageSuggestion?: string
}

export default function PostComposer({ userId, profile, onPostSaved, onCancel, prefillContent, prefillImageSuggestion }: PostComposerProps) {
  const [content, setContent] = useState(prefillContent || '')
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('facebook')
  const [scheduledAt, setScheduledAt] = useState<string>('')
  const [scheduledTime, setScheduledTime] = useState<string>('')
  const [status, setStatus] = useState<'draft' | 'scheduled'>('draft')
  const [adapting, setAdapting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [optimalTiming, setOptimalTiming] = useState<{ bestTime: string; reason: string } | null>(null)

  useEffect(() => {
    if (profile && selectedPlatform) {
      const timing = getOptimalTimingSuggestion(selectedPlatform, profile)
      setOptimalTiming(timing)
    }
  }, [selectedPlatform, profile])

  useEffect(() => {
    if (prefillContent) {
      setContent(prefillContent)
    }
  }, [prefillContent])

  const characterCount = content.length
  const limit: { max: number; warning: number } = PLATFORM_LIMITS[selectedPlatform] || PLATFORM_LIMITS.facebook
  const isOverLimit = characterCount > limit.max
  const isNearLimit = characterCount > limit.warning && !isOverLimit
  const remainingChars = limit.max - characterCount

  const handleAdaptForPlatform = async (platform: 'instagram' | 'twitter') => {
    if (!content.trim()) {
      alert('Please write some content first before adapting')
      return
    }

    if (!profile) {
      alert('Business profile is required for content adaptation')
      return
    }

    setAdapting(true)
    try {
      const res = await fetch('/api/social/adapt-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          content,
          platform,
          profile
        })
      })

      if (!res.ok) {
        throw new Error('Failed to adapt content')
      }

      const json = await res.json()
      setContent(json.adaptedContent)
      setSelectedPlatform(platform)
    } catch (error) {
      console.error('Error adapting content:', error)
      alert('Failed to adapt content. Please try again.')
    } finally {
      setAdapting(false)
    }
  }

  const handleSave = async (saveStatus: 'draft' | 'scheduled') => {
    if (!content.trim()) {
      alert('Please write some content before saving')
      return
    }

    if (saveStatus === 'scheduled' && !scheduledAt) {
      alert('Please select a date and time for scheduling')
      return
    }

    if (isOverLimit) {
      alert(`Content exceeds ${selectedPlatform} character limit (${limit.max}). Please shorten your content.`)
      return
    }

    setSaving(true)
    try {
      // Calculate scheduledAt timestamp
      let scheduledAtTimestamp: string | null = null
      if (saveStatus === 'scheduled' && scheduledAt && scheduledTime) {
        const dateTime = new Date(`${scheduledAt}T${scheduledTime}`)
        scheduledAtTimestamp = dateTime.toISOString()
      }

      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          content,
          platform: selectedPlatform,
          status: saveStatus,
          scheduledAt: scheduledAtTimestamp
        })
      })

      if (!res.ok) {
        throw new Error('Failed to save post')
      }

      // Reset form
      setContent('')
      setScheduledAt('')
      setScheduledTime('')
      setStatus('draft')

      if (onPostSaved) {
        onPostSaved()
      }
    } catch (error) {
      console.error('Error saving post:', error)
      alert('Failed to save post. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Get date-time inputs for today + 1 hour as default
  const getDefaultDateTime = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    return {
      date: tomorrow.toISOString().split('T')[0],
      time: '09:00'
    }
  }

  useEffect(() => {
    if (status === 'scheduled' && !scheduledAt) {
      const defaultSchedule = getDefaultDateTime()
      setScheduledAt(defaultSchedule.date)
      setScheduledTime(defaultSchedule.time)
    }
  }, [status, scheduledAt])

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Social Media Post</h3>
        <p className="text-sm text-gray-500">
          Write your content and adapt it for different platforms, or schedule it for later.
        </p>
      </div>

      {/* Platform Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Platform
        </label>
        <div className="flex space-x-2 flex-wrap">
          {(['facebook', 'linkedin', 'instagram', 'twitter', 'google_business'] as SocialPlatform[]).map((platform) => (
            <button
              key={platform}
              onClick={() => setSelectedPlatform(platform)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                selectedPlatform === platform
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {platform === 'twitter' ? 'Twitter/X' : platform === 'google_business' ? 'Google Business' : platform}
            </button>
          ))}
        </div>
      </div>

      {/* Image Suggestion Display */}
      {prefillImageSuggestion && (
        <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-900 mb-1">💡 Image Suggestion</p>
              <p className="text-sm text-purple-700">{prefillImageSuggestion}</p>
            </div>
          </div>
        </div>
      )}

      {/* Content Editor */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Content
          </label>
          <div className="flex items-center space-x-4">
            {/* Adapt Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => handleAdaptForPlatform('instagram')}
                disabled={adapting || !content.trim()}
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SparklesIcon className="h-4 w-4" />
                <span>Adapt for Instagram</span>
              </button>
              <button
                onClick={() => handleAdaptForPlatform('twitter')}
                disabled={adapting || !content.trim()}
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SparklesIcon className="h-4 w-4" />
                <span>Adapt for Twitter</span>
              </button>
            </div>
            {/* Character Counter */}
            <div className={`text-sm font-medium ${
              isOverLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-500'
            }`}>
              {characterCount} / {limit.max}
              {isOverLimit && <span className="ml-1">⚠️</span>}
            </div>
          </div>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Write your ${selectedPlatform} post here...`}
          className={`w-full h-48 px-4 py-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            isOverLimit ? 'border-red-300' : isNearLimit ? 'border-yellow-300' : 'border-gray-300'
          }`}
        />
        {isOverLimit && (
          <div className="mt-2 flex items-center space-x-1 text-sm text-red-600">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <span>Content exceeds {selectedPlatform} limit by {Math.abs(remainingChars)} characters</span>
          </div>
        )}
        {isNearLimit && !isOverLimit && (
          <div className="mt-2 flex items-center space-x-1 text-sm text-yellow-600">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <span>Approaching character limit ({remainingChars} remaining)</span>
          </div>
        )}
      </div>

      {/* Optimal Timing Suggestion */}
      {optimalTiming && status === 'scheduled' && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>💡 Optimal Timing:</strong> Best time to post on {selectedPlatform} is {optimalTiming.bestTime}. {optimalTiming.reason}
          </p>
        </div>
      )}

      {/* Scheduling Options */}
      <div className="mb-4">
        <div className="flex items-center space-x-4 mb-3">
          <label className="flex items-center">
            <input
              type="radio"
              checked={status === 'draft'}
              onChange={() => setStatus('draft')}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Save as Draft</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              checked={status === 'scheduled'}
              onChange={() => setStatus('scheduled')}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Schedule</span>
          </label>
        </div>

        {status === 'scheduled' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
        )}
        <button
          onClick={() => handleSave('draft')}
          disabled={saving || !content.trim()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save as Draft'}
        </button>
        <button
          onClick={() => handleSave('scheduled')}
          disabled={saving || !content.trim() || (status === 'scheduled' && (!scheduledAt || !scheduledTime))}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Schedule'}
        </button>
      </div>

      {adapting && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">Adapting content with AI...</p>
        </div>
      )}
    </div>
  )
}

