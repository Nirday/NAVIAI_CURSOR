'use client'

import { useState, useEffect } from 'react'
import { supabaseAdmin } from '@/lib/supabase'

type TargetAudience = 'all_users' | 'paying_users' | 'trial_users'

export default function BroadcastComposer() {
  const [targetAudience, setTargetAudience] = useState<TargetAudience | ''>('')
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [loadingCount, setLoadingCount] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  // Load recipient count when target changes
  useEffect(() => {
    if (targetAudience) {
      fetchRecipientCount(targetAudience)
    } else {
      setRecipientCount(null)
    }
  }, [targetAudience])

  const fetchRecipientCount = async (target: TargetAudience) => {
    setLoadingCount(true)
    try {
      const res = await fetch(`/api/admin/broadcasts/recipient-count?target=${target}`)
      if (!res.ok) {
        throw new Error('Failed to fetch recipient count')
      }
      const data = await res.json()
      setRecipientCount(data.count)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to load recipient count' })
      setRecipientCount(null)
    } finally {
      setLoadingCount(false)
    }
  }

  const handleSend = () => {
    // Validation
    if (!targetAudience) {
      setMessage({ type: 'error', text: 'Please select a target audience' })
      return
    }
    if (!subject.trim()) {
      setMessage({ type: 'error', text: 'Please enter a subject line' })
      return
    }
    if (!body.trim()) {
      setMessage({ type: 'error', text: 'Please enter email content' })
      return
    }
    if (recipientCount === null || recipientCount === 0) {
      setMessage({ type: 'error', text: 'No recipients found for selected audience' })
      return
    }

    // Show confirmation
    setShowConfirm(true)
  }

  const confirmSend = async () => {
    setShowConfirm(false)
    setSending(true)
    setProgress({ current: 0, total: recipientCount || 0 })
    setResult(null)
    setMessage(null)

    try {
      const res = await fetch('/api/admin/broadcasts/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetAudience,
          subject,
          body
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to send broadcast')
      }

      // For real-time progress, we'll use Server-Sent Events or polling
      // For V1, we'll use a simpler approach: the API will send in batches and return progress
      // Actually, let me check the API implementation - we'll need to handle this differently
      
      const data = await res.json()
      setResult({ sent: data.sent, failed: data.failed })
      setProgress(null)
      setMessage({
        type: 'success',
        text: `Broadcast sent to ${data.sent} users. ${data.failed} sends failed.`
      })
      
      // Reset form
      setSubject('')
      setBody('')
      setTargetAudience('')
      setRecipientCount(null)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send broadcast' })
      setProgress(null)
    } finally {
      setSending(false)
    }
  }

  const handleCancel = () => {
    setShowConfirm(false)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Broadcast</h1>
        <p className="text-gray-600 mt-1">Send platform-wide announcements to users</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Progress Indicator */}
      {progress && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">Sending broadcast...</span>
            <span className="text-sm text-blue-700">
              {progress.current} / {progress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Result Summary */}
      {result && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Broadcast Complete</h3>
          <p className="text-sm text-gray-600">
            Sent: {result.sent} users | Failed: {result.failed} sends
          </p>
        </div>
      )}

      {/* Broadcast Form */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Compose Broadcast</h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="p-6 space-y-6"
        >
          {/* Target Audience Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Target Audience
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="all_users"
                  checked={targetAudience === 'all_users'}
                  onChange={(e) => setTargetAudience(e.target.value as TargetAudience)}
                  className="mr-3"
                />
                <span>All Users</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="paying_users"
                  checked={targetAudience === 'paying_users'}
                  onChange={(e) => setTargetAudience(e.target.value as TargetAudience)}
                  className="mr-3"
                />
                <span>Paying Users (Active Subscriptions)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="trial_users"
                  checked={targetAudience === 'trial_users'}
                  onChange={(e) => setTargetAudience(e.target.value as TargetAudience)}
                  className="mr-3"
                />
                <span>Trial Users</span>
              </label>
            </div>

            {/* Recipient Count */}
            {targetAudience && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                {loadingCount ? (
                  <span className="text-sm text-gray-600">Loading recipient count...</span>
                ) : recipientCount !== null ? (
                  <span className="text-sm font-medium text-gray-900">
                    This will be sent to {recipientCount.toLocaleString()} users.
                  </span>
                ) : (
                  <span className="text-sm text-gray-600">Unable to load recipient count</span>
                )}
              </div>
            )}
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Email Body (Rich Text) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Content
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter email content (HTML supported)..."
              rows={12}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              required
            />
            <p className="mt-2 text-xs text-gray-500">
              You can use HTML tags for formatting (e.g., &lt;strong&gt;, &lt;a&gt;, &lt;p&gt;)
            </p>
          </div>

          {/* Send Button */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={sending || !targetAudience || !subject.trim() || !body.trim() || recipientCount === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : 'Send Broadcast'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSubject('')
                setBody('')
                setTargetAudience('')
                setRecipientCount(null)
                setMessage(null)
                setResult(null)
              }}
              disabled={sending}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Broadcast</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to send this broadcast to{' '}
              <strong>{recipientCount?.toLocaleString()} users</strong>?
            </p>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-1">Subject:</p>
              <p className="text-sm text-gray-600">{subject}</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={confirmSend}
                disabled={sending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Confirm & Send'}
              </button>
              <button
                onClick={handleCancel}
                disabled={sending}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

