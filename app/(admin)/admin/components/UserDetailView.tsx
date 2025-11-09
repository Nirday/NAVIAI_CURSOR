'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
// ActivityEvent type - matches contact-hub structure
interface ActivityEvent {
  id: string
  userId: string
  contactId?: string
  eventType: string
  content: string
  createdAt: Date
}

interface UserDetails {
  id: string
  email: string
  name?: string
  role: 'user' | 'admin' | 'super_admin'
  createdAt: string
  subscriptionStatus?: string
  subscriptionPlan?: string
}

interface UserDetailViewProps {
  userId: string
}

export default function UserDetailView({ userId }: UserDetailViewProps) {
  const router = useRouter()
  const [user, setUser] = useState<UserDetails | null>(null)
  const [activityLogs, setActivityLogs] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showActivityLog, setShowActivityLog] = useState(false)
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false)
  const [impersonating, setImpersonating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchUserDetails()
  }, [userId])

  const fetchUserDetails = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/users/${userId}`)
      if (!res.ok) {
        throw new Error('Failed to fetch user details')
      }
      const data = await res.json()
      setUser(data.user)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to load user details' })
    } finally {
      setLoading(false)
    }
  }

  const fetchActivityLogs = async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/activity`)
      if (!res.ok) {
        throw new Error('Failed to fetch activity logs')
      }
      const data = await res.json()
      setActivityLogs(data.events || [])
      setShowActivityLog(true)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to load activity logs' })
    }
  }

  const handleSendPasswordReset = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to send a password reset email to ${user?.email}?`
    )

    if (!confirmed) {
      return
    }

    try {
      setSendingPasswordReset(true)
      setMessage(null)

      const res = await fetch(`/api/admin/users/${userId}/password-reset`, {
        method: 'POST'
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to send password reset')
      }

      setMessage({
        type: 'success',
        text: 'Password reset email sent successfully'
      })
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send password reset' })
    } finally {
      setSendingPasswordReset(false)
    }
  }

  const handleImpersonate = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to impersonate ${user?.email}? You will be logged in as this user.`
    )

    if (!confirmed) {
      return
    }

    try {
      setImpersonating(true)
      setMessage(null)

      const res = await fetch(`/api/admin/users/${userId}/impersonate`, {
        method: 'POST'
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to start impersonation')
      }

      const data = await res.json()
      
      // Redirect to dashboard with impersonation token
      window.location.href = `/dashboard?impersonate=${data.token}`
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to start impersonation' })
      setImpersonating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading user details...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">User not found</p>
        <button
          onClick={() => router.push('/admin/users')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Users
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/users')}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Users
        </button>
        <h1 className="text-3xl font-bold text-gray-900">User Details</h1>
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

      {/* User Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">User Information</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{user.name || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Role</dt>
            <dd className="mt-1">
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  user.role === 'super_admin'
                    ? 'bg-purple-100 text-purple-800'
                    : user.role === 'admin'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {user.role}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created At</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(user.createdAt).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Subscription Status</dt>
            <dd className="mt-1 text-sm text-gray-900">{user.subscriptionStatus || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Subscription Plan</dt>
            <dd className="mt-1 text-sm text-gray-900">{user.subscriptionPlan || '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleSendPasswordReset}
            disabled={sendingPasswordReset}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendingPasswordReset ? 'Sending...' : 'Send Password Reset'}
          </button>
          <button
            onClick={fetchActivityLogs}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            View Activity Log
          </button>
          <button
            onClick={handleImpersonate}
            disabled={impersonating}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {impersonating ? 'Starting...' : 'Impersonate User'}
          </button>
        </div>
      </div>

      {/* Activity Log */}
      {showActivityLog && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Activity Log</h2>
          {activityLogs.length === 0 ? (
            <p className="text-gray-500">No activity found</p>
          ) : (
            <div className="space-y-4">
              {activityLogs.map((event) => (
                <div key={event.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{event.eventType}</p>
                      <p className="text-sm text-gray-600">{event.content}</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(event.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

