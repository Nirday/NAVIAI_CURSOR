"use client"

import React, { useState, useEffect } from 'react'
import { ChevronRightIcon, ChevronLeftIcon, CheckIcon } from '@heroicons/react/24/outline'
import CommunicationComposer from '../components/CommunicationComposer'
import { Contact } from '@/libs/contact-hub/src/types'

interface CreateBroadcastFlowProps {
  userId: string
  onComplete?: (broadcastId: string) => void
  onCancel?: () => void
  className?: string
}

type Channel = 'email' | 'sms'
type Step = 'channel' | 'audience' | 'content' | 'confirm'

export default function CreateBroadcastFlow({
  userId,
  onComplete,
  onCancel,
  className = ''
}: CreateBroadcastFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('channel')
  const [channel, setChannel] = useState<Channel | null>(null)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [audiencePreview, setAudiencePreview] = useState<{ count: number; contacts: Contact[] } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [skipAbTest, setSkipAbTest] = useState(false)
  const [contentData, setContentData] = useState<{
    subjectLines: string[]
    selectedSubjects: string[]
    body: string
  } | null>(null)
  const [scheduledAt, setScheduledAt] = useState<string>('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchTags()
  }, [])

  useEffect(() => {
    if (channel) {
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

  const handleContentGenerated = (content: {
    subjectLines: string[]
    selectedSubjects: string[]
    body: string
  }) => {
    setContentData(content)
  }

  const handleSend = async (useAbTest: boolean = false) => {
    if (!channel || !contentData || !audiencePreview) return

    setSending(true)
    try {
      // If useAbTest is true, force A/B test (ignore skipAbTest state)
      // If useAbTest is false, use skipAbTest state
      const shouldSkipAbTest = useAbTest ? false : skipAbTest
      
      // Prepare content versions
      const contentVersions = shouldSkipAbTest
        ? [{
            variant: 'A',
            subject: contentData.selectedSubjects[0] || contentData.subjectLines[0],
            body: contentData.body
          }]
        : contentData.selectedSubjects.map((subject, index) => ({
            variant: index === 0 ? 'A' : 'B',
            subject,
            body: contentData.body // Same body for both variants
          }))

      const res = await fetch('/api/communication/broadcasts', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel,
          tags: selectedTags,
          contentVersions,
          abTestConfig: shouldSkipAbTest ? null : {
            testSizePercentage: 20,
            variantASize: 50,
            variantBSize: 50
          },
          scheduledAt: scheduledAt || null,
          skipAbTest: shouldSkipAbTest
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create broadcast')
      }

      const data = await res.json()
      if (onComplete) {
        onComplete(data.broadcast.id)
      }
    } catch (error: any) {
      console.error('Error creating broadcast:', error)
      alert(`Failed to create broadcast: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  const canProceedToAudience = () => channel !== null
  const canProceedToContent = () => audiencePreview !== null && audiencePreview.count > 0
  const canProceedToConfirm = () => {
    if (!contentData) return false
    if (skipAbTest) {
      return contentData.selectedSubjects.length === 1
    }
    return contentData.selectedSubjects.length === 1 || contentData.selectedSubjects.length === 2
  }
  const canSendWithAbTest = () => contentData !== null && contentData.selectedSubjects.length === 2

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {(['channel', 'audience', 'content', 'confirm'] as Step[]).map((step, index) => (
            <React.Fragment key={step}>
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === step
                      ? 'bg-blue-600 text-white'
                      : ['channel', 'audience', 'content', 'confirm'].indexOf(currentStep) > index
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {['channel', 'audience', 'content', 'confirm'].indexOf(currentStep) > index ? (
                    <CheckIcon className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`ml-2 text-sm font-medium ${
                    currentStep === step ? 'text-blue-600' : 'text-gray-600'
                  }`}
                >
                  {step === 'channel' ? 'Channel' : step === 'audience' ? 'Audience' : step === 'content' ? 'Content' : 'Confirm'}
                </span>
              </div>
              {index < 3 && (
                <div className={`flex-1 h-0.5 mx-4 ${['channel', 'audience', 'content', 'confirm'].indexOf(currentStep) > index ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Channel Selection */}
      {currentStep === 'channel' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Channel</h2>
            <p className="text-gray-600">Choose how you want to send this broadcast</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setChannel('email')}
              className={`p-6 border-2 rounded-lg text-left transition-colors ${
                channel === 'email'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <h3 className="font-semibold text-lg mb-2">📧 Email</h3>
              <p className="text-sm text-gray-600">Send to contacts with email addresses</p>
            </button>
            <button
              onClick={() => setChannel('sms')}
              className={`p-6 border-2 rounded-lg text-left transition-colors ${
                channel === 'sms'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <h3 className="font-semibold text-lg mb-2">💬 SMS</h3>
              <p className="text-sm text-gray-600">Send to contacts with phone numbers</p>
            </button>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setCurrentStep('audience')}
              disabled={!canProceedToAudience()}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Audience Selection */}
      {currentStep === 'audience' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Audience</h2>
            <p className="text-gray-600">Choose tags to filter your contacts</p>
          </div>
          <div className="space-y-3">
            {availableTags.length === 0 ? (
              <p className="text-gray-500">No tags available. Contacts will be selected by channel.</p>
            ) : (
              availableTags.map(tag => (
                <label
                  key={tag}
                  className="flex items-center gap-3 p-3 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag)}
                    onChange={() => handleTagToggle(tag)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900">{tag}</span>
                </label>
              ))
            )}
          </div>
          {loadingPreview ? (
            <p className="text-sm text-gray-500">Loading preview...</p>
          ) : audiencePreview ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm font-medium text-blue-900">
                {audiencePreview.count} {channel === 'email' ? 'contacts with email' : 'contacts with phone'} will receive this broadcast
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {selectedTags.length > 0 
                ? 'Select tags to filter contacts' 
                : `No tags selected. All contacts with ${channel === 'email' ? 'email' : 'phone'} will be included.`}
            </p>
          )}
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep('channel')}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={() => setCurrentStep('content')}
              disabled={!canProceedToContent()}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Content */}
      {currentStep === 'content' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Content</h2>
            <p className="text-gray-600">Generate your message using AI</p>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={skipAbTest}
                onChange={(e) => {
                  setSkipAbTest(e.target.checked)
                  // Clear selections when toggling
                  if (contentData) {
                    setContentData({
                      ...contentData,
                      selectedSubjects: []
                    })
                  }
                }}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-blue-900">
                Skip A/B testing (send single version)
              </span>
            </label>
            <p className="text-xs text-blue-700 mt-2">
              {skipAbTest
                ? 'You will send a single version to all recipients. Select only 1 subject line.'
                : 'Select 2 subject lines for A/B testing, or enable this option to send a single version.'}
            </p>
          </div>
          <CommunicationComposer
            userId={userId}
            onContentGenerated={handleContentGenerated}
            skipAbTest={skipAbTest}
          />
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep('audience')}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={() => setCurrentStep('confirm')}
              disabled={!canProceedToConfirm()}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm & Schedule */}
      {currentStep === 'confirm' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm & Schedule</h2>
            <p className="text-gray-600">Review your broadcast and choose when to send</p>
          </div>

          {/* Summary */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md space-y-2">
            <p className="text-sm">
              <span className="font-medium">Channel:</span> {channel === 'email' ? '📧 Email' : '💬 SMS'}
            </p>
            <p className="text-sm">
              <span className="font-medium">Audience:</span> {audiencePreview?.count || 0} contacts
              {selectedTags.length > 0 && ` (tags: ${selectedTags.join(', ')})`}
            </p>
            {contentData && (
              <>
                <p className="text-sm">
                  <span className="font-medium">Subject Lines:</span> {contentData.selectedSubjects.length} selected
                </p>
                <p className="text-sm">
                  <span className="font-medium">A/B Test:</span> {contentData.selectedSubjects.length === 2 ? 'Yes' : 'No'}
                </p>
              </>
            )}
          </div>

          {/* Scheduling */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              When to send?
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="schedule"
                  value="immediate"
                  checked={scheduledAt === ''}
                  onChange={() => setScheduledAt('')}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900">Send immediately</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="schedule"
                  value="scheduled"
                  checked={scheduledAt !== ''}
                  onChange={() => {
                    if (!scheduledAt) {
                      // Set default to tomorrow at 9 AM
                      const tomorrow = new Date()
                      tomorrow.setDate(tomorrow.getDate() + 1)
                      tomorrow.setHours(9, 0, 0, 0)
                      setScheduledAt(tomorrow.toISOString().slice(0, 16))
                    }
                  }}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900">Schedule for later</span>
              </label>
              {scheduledAt !== '' && (
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="ml-7 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between gap-4">
            <button
              onClick={() => setCurrentStep('content')}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Back
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => handleSend(false)} // false = use skipAbTest state (single version)
                disabled={sending || !contentData}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Creating...' : scheduledAt ? 'Schedule' : 'Send Now'}
              </button>
              {!skipAbTest && canSendWithAbTest() && (
                <button
                  onClick={() => handleSend(true)} // true = use A/B test (ignore skipAbTest state)
                  disabled={sending}
                  className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? 'Creating...' : 'Find Best Subject & Send'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

