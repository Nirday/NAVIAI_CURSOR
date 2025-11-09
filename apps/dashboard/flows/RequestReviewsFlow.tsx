"use client"

import React, { useState, useEffect } from 'react'
import { ChevronRightIcon, ChevronLeftIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { ReviewPlatform } from '@/libs/reputation-hub/src/types'
import { Contact } from '@/libs/contact-hub/src/types'

interface RequestReviewsFlowProps {
  userId: string
  onComplete?: (broadcastId: string) => void
  onCancel?: () => void
  className?: string
}

type Step = 'platform' | 'audience' | 'message' | 'send'

export default function RequestReviewsFlow({
  userId,
  onComplete,
  onCancel,
  className = ''
}: RequestReviewsFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('platform')
  const [platform, setPlatform] = useState<ReviewPlatform | null>(null)
  const [hasPlatformLink, setHasPlatformLink] = useState<boolean | null>(null)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [audiencePreview, setAudiencePreview] = useState<{ count: number; contacts: Contact[] } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [messageTemplate, setMessageTemplate] = useState<string>('')
  const [channel, setChannel] = useState<'email' | 'sms'>('email')
  const [sending, setSending] = useState(false)
  const [reputationSettings, setReputationSettings] = useState<any>(null)

  useEffect(() => {
    fetchTags()
    fetchReputationSettings()
  }, [])

  useEffect(() => {
    if (platform) {
      checkPlatformLink()
    }
  }, [platform])

  useEffect(() => {
    if (channel && selectedTags.length > 0) {
      previewAudience()
    }
  }, [channel, selectedTags])

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/communication/contacts/tags', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const data = await res.json()
        setAvailableTags(data.tags || [])
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error)
    }
  }

  const fetchReputationSettings = async () => {
    try {
      const res = await fetch('/api/reputation/settings', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const data = await res.json()
        setReputationSettings(data.settings)
        if (data.settings?.reviewRequestTemplate) {
          setMessageTemplate(data.settings.reviewRequestTemplate)
        }
      }
    } catch (error) {
      console.error('Failed to fetch reputation settings:', error)
    }
  }

  const checkPlatformLink = async () => {
    if (!platform) return

    try {
      const res = await fetch(`/api/reputation/settings/check-link?platform=${platform}`, {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const data = await res.json()
        setHasPlatformLink(data.hasLink)
      }
    } catch (error) {
      console.error('Failed to check platform link:', error)
      setHasPlatformLink(false)
    }
  }

  const previewAudience = async () => {
    if (!channel) return

    setLoadingPreview(true)
    try {
      const res = await fetch('/api/communication/audiences/preview', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel,
          tags: selectedTags
        })
      })
      if (res.ok) {
        const data = await res.json()
        setAudiencePreview(data)
      }
    } catch (error) {
      console.error('Failed to preview audience:', error)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const handleSend = async () => {
    if (!platform || !messageTemplate.trim()) {
      alert('Please complete all required fields.')
      return
    }

    if (!hasPlatformLink) {
      alert('Please add your review link in Reputation Settings first.')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/reputation/campaigns/create', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          platform,
          tags: selectedTags,
          messageTemplate: messageTemplate.trim(),
          channel
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (onComplete) {
          onComplete(data.broadcastId)
        } else {
          alert('Review request campaign created successfully!')
        }
      } else {
        const error = await res.json()
        alert(`Error: ${error.error || 'Failed to create campaign'}`)
      }
    } catch (error: any) {
      console.error('Error creating campaign:', error)
      alert(`Error: ${error.message || 'Failed to create campaign'}`)
    } finally {
      setSending(false)
    }
  }

  const canProceedFromPlatform = platform !== null && hasPlatformLink === true
  const canProceedFromAudience = selectedTags.length > 0 && (audiencePreview?.count || 0) > 0
  const canProceedFromMessage = messageTemplate.trim().length > 0

  const steps: Step[] = ['platform', 'audience', 'message', 'send']
  const currentStepIndex = steps.indexOf(currentStep)

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Reviews</h2>
        <p className="text-sm text-gray-600">
          Send review requests to your customers. They'll be asked for feedback first, then directed to leave a review if they're happy.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8 flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              index < currentStepIndex
                ? 'bg-green-500 text-white'
                : index === currentStepIndex
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {index < currentStepIndex ? (
                <CheckIcon className="h-5 w-5" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-2 ${
                index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Platform Selection */}
      {currentStep === 'platform' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Review Platform</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['google', 'yelp', 'facebook'] as ReviewPlatform[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    platform === p
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium capitalize">{p}</span>
                    {platform === p && (
                      <CheckIcon className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {platform && hasPlatformLink === false && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    Review link not found
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    You must add your {platform.charAt(0).toUpperCase() + platform.slice(1)} review link in Reputation Settings before you can run this campaign.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => {
                if (onCancel) onCancel()
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 mr-3"
            >
              Cancel
            </button>
            <button
              onClick={() => setCurrentStep('audience')}
              disabled={!canProceedFromPlatform}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              Next
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Audience Selection */}
      {currentStep === 'audience' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Audience</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Channel</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="email"
                    checked={channel === 'email'}
                    onChange={(e) => setChannel(e.target.value as 'email' | 'sms')}
                    className="mr-2"
                  />
                  Email
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="sms"
                    checked={channel === 'sms'}
                    onChange={(e) => setChannel(e.target.value as 'email' | 'sms')}
                    className="mr-2"
                  />
                  SMS
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Tags</label>
              <div className="flex flex-wrap gap-2 mb-4">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {loadingPreview ? (
              <div className="text-sm text-gray-500">Loading preview...</div>
            ) : audiencePreview ? (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">
                  {audiencePreview.count} contact{audiencePreview.count !== 1 ? 's' : ''} will receive this campaign
                </p>
              </div>
            ) : selectedTags.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">Select at least one tag to preview audience</p>
              </div>
            ) : null}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep('platform')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 flex items-center"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              Back
            </button>
            <button
              onClick={() => setCurrentStep('message')}
              disabled={!canProceedFromAudience}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              Next
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Message Customization */}
      {currentStep === 'message' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customize Message</h3>
            <p className="text-sm text-gray-600 mb-4">
              Your message will be sent with a link to your feedback page. The link will be automatically added at the end.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Template
            </label>
            <textarea
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="We'd love to hear your feedback on your recent service!"
            />
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep('audience')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 flex items-center"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              Back
            </button>
            <button
              onClick={() => setCurrentStep('send')}
              disabled={!canProceedFromMessage}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              Next
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Send */}
      {currentStep === 'send' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Campaign Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Platform:</span>
                <span className="text-sm text-gray-900 capitalize">{platform}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Channel:</span>
                <span className="text-sm text-gray-900 capitalize">{channel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Audience:</span>
                <span className="text-sm text-gray-900">{audiencePreview?.count || 0} contacts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Tags:</span>
                <span className="text-sm text-gray-900">{selectedTags.join(', ') || 'None'}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep('message')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 flex items-center"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              Back
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : 'Send Campaign'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

