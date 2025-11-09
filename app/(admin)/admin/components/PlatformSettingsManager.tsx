'use client'

import { useState, useEffect } from 'react'
import { PlatformSetting } from '@/libs/admin-center/src/types'

export default function PlatformSettingsManager() {
  const [settings, setSettings] = useState<PlatformSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({})
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/platform-settings')
      if (!res.ok) {
        throw new Error('Failed to fetch settings')
      }
      const data = await res.json()
      
      // Filter to only show editable settings
      const editableSettings = (data.settings || []).filter(
        (s: PlatformSetting) => s.isEditableByAdmin === true
      )
      
      setSettings(editableSettings)
      
      // Store original values for comparison
      const originals: Record<string, string> = {}
      editableSettings.forEach((s: PlatformSetting) => {
        originals[s.key] = s.value
      })
      setOriginalValues(originals)
      setPendingChanges({})
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleValueChange = (key: string, value: string) => {
    setPendingChanges((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSave = () => {
    // Check if there are any changes
    const hasChanges = Object.keys(pendingChanges).length > 0
    if (!hasChanges) {
      setMessage({ type: 'error', text: 'No changes to save' })
      return
    }

    // Show confirmation dialog
    setShowConfirm(true)
  }

  const confirmSave = async () => {
    setShowConfirm(false)
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/admin/platform-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          updates: pendingChanges
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save settings')
      }

      // Refresh settings
      await fetchSettings()
      setMessage({
        type: 'success',
        text: 'Settings saved successfully'
      })
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setPendingChanges({})
    setShowConfirm(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-gray-600 mt-1">Manage global platform configuration</p>
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

      {/* Settings Form */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Editable Settings</h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSave()
          }}
          className="p-6 space-y-6"
        >
          {settings.length === 0 ? (
            <p className="text-gray-500">No editable settings available</p>
          ) : (
            settings.map((setting) => (
              <div key={setting.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {setting.key}
                </label>
                <p className="text-sm text-gray-500 mb-2">{setting.description}</p>
                <input
                  type="text"
                  value={pendingChanges[setting.key] !== undefined ? pendingChanges[setting.key] : setting.value}
                  onChange={(e) => handleValueChange(setting.key, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={setting.value}
                />
              </div>
            ))
          )}

          {settings.length > 0 && (
            <div className="flex gap-4 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving || Object.keys(pendingChanges).length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving || Object.keys(pendingChanges).length === 0}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Changes</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to save these changes? This will update the platform settings and may affect all users.
            </p>
            <div className="flex gap-4">
              <button
                onClick={confirmSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Confirm'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={saving}
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

