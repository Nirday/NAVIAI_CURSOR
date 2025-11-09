'use client'

import { useState, useEffect } from 'react'
import { FeatureFlag } from '@/libs/admin-center/src/types'

export default function FeatureFlagManager() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchFlags()
  }, [])

  const fetchFlags = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/feature-flags')
      if (!res.ok) {
        throw new Error('Failed to fetch feature flags')
      }
      const data = await res.json()
      setFlags(data.flags || [])
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to load feature flags' })
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (flagId: string, currentValue: boolean) => {
    // Confirm before toggling
    const confirmed = window.confirm(
      `Are you sure you want to ${currentValue ? 'disable' : 'enable'} the feature flag "${flagId}"?`
    )

    if (!confirmed) {
      return
    }

    try {
      setToggling(flagId)
      setMessage(null)

      const res = await fetch(`/api/admin/feature-flags/${flagId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          enabled: !currentValue
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to toggle feature flag')
      }

      // Refresh flags
      await fetchFlags()
      setMessage({
        type: 'success',
        text: `Feature flag "${flagId}" has been ${!currentValue ? 'enabled' : 'disabled'}`
      })

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to toggle feature flag' })
    } finally {
      setToggling(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading feature flags...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Feature Flags</h1>
        <p className="text-gray-600 mt-1">Manage feature rollouts and toggles</p>
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

      {/* Flags List */}
      <div className="bg-white rounded-lg shadow">
        {flags.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p>No feature flags found.</p>
            <p className="text-sm mt-2">Feature flags are created in code and will appear here once added.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {flags.map((flag) => (
              <div
                key={flag.flagId}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{flag.flagId}</h3>
                    <p className="text-sm text-gray-600 mt-1">{flag.description}</p>
                  </div>
                  <div className="ml-6 flex items-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={flag.isEnabled}
                        onChange={() => handleToggle(flag.flagId, flag.isEnabled)}
                        disabled={toggling === flag.flagId}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ml-3 text-sm font-medium text-gray-700">
                        {flag.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                    {toggling === flag.flagId && (
                      <div className="ml-4">
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

