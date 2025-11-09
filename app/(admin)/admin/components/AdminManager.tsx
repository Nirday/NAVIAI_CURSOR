'use client'

import { useState, useEffect } from 'react'
import { UserRole } from '@/libs/admin-center/src/types'

interface AdminUser {
  id: string
  email: string
  role: 'admin' | 'super_admin'
}

interface PendingInvite {
  id: string
  email: string
  roleToAssign: 'admin' | 'super_admin'
  invitedAt: string
  expiresAt: string
  invitedBy: string
}

export default function AdminManager() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'super_admin'>('admin')
  const [sendingInvite, setSendingInvite] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchAdmins()
  }, [])

  const fetchAdmins = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/admins')
      if (!res.ok) {
        throw new Error('Failed to fetch admins')
      }
      const data = await res.json()
      setAdminUsers(data.admins || [])
      setPendingInvites(data.pendingInvites || [])
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to load admins' })
    } finally {
      setLoading(false)
    }
  }

  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' })
      return
    }

    try {
      setSendingInvite(true)
      setMessage(null)

      const res = await fetch('/api/admin/admins/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to send invite')
      }

      // Refresh list
      await fetchAdmins()
      setShowInviteForm(false)
      setInviteEmail('')
      setInviteRole('admin')
      setMessage({
        type: 'success',
        text: `Invitation sent to ${inviteEmail}`
      })
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send invite' })
    } finally {
      setSendingInvite(false)
    }
  }

  const handleRemoveAdmin = async (userId: string, userEmail: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove admin access from ${userEmail}? They will be demoted to a regular user.`
    )

    if (!confirmed) {
      return
    }

    try {
      setRemoving(userId)
      setMessage(null)

      const res = await fetch(`/api/admin/admins/${userId}/remove`, {
        method: 'POST'
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to remove admin')
      }

      // Refresh list
      await fetchAdmins()
      setMessage({
        type: 'success',
        text: 'Admin access removed successfully'
      })
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to remove admin' })
    } finally {
      setRemoving(null)
    }
  }

  const handleRevokeInvite = async (inviteId: string, email: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to revoke the invitation sent to ${email}?`
    )

    if (!confirmed) {
      return
    }

    try {
      setRevoking(inviteId)
      setMessage(null)

      const res = await fetch(`/api/admin/invites/${inviteId}/revoke`, {
        method: 'POST'
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to revoke invite')
      }

      // Refresh list
      await fetchAdmins()
      setMessage({
        type: 'success',
        text: 'Invitation revoked successfully'
      })
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to revoke invite' })
    } finally {
      setRevoking(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading admins...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Management</h1>
          <p className="text-gray-600 mt-1">Manage admin access and invitations</p>
        </div>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showInviteForm ? 'Cancel' : '+ Invite Admin'}
        </button>
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

      {/* Invite Form */}
      {showInviteForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Invite New Admin</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role to Assign
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="admin"
                    checked={inviteRole === 'admin'}
                    onChange={(e) => setInviteRole(e.target.value as 'admin')}
                    className="mr-2"
                  />
                  <span>Admin</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="super_admin"
                    checked={inviteRole === 'super_admin'}
                    onChange={(e) => setInviteRole(e.target.value as 'super_admin')}
                    className="mr-2"
                  />
                  <span>Super Admin</span>
                </label>
              </div>
            </div>
            <button
              onClick={handleSendInvite}
              disabled={sendingInvite || !inviteEmail}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingInvite ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </div>
      )}

      {/* Current Admin Users */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Current Admin Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {adminUsers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    No admin users found
                  </td>
                </tr>
              ) : (
                adminUsers.map((admin) => (
                  <tr key={admin.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {admin.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          admin.role === 'super_admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                        disabled={removing === admin.id}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {removing === admin.id ? 'Removing...' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invites */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Pending Invites</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role to Assign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invited At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingInvites.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No pending invites
                  </td>
                </tr>
              ) : (
                pendingInvites.map((invite) => (
                  <tr key={invite.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invite.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          invite.roleToAssign === 'super_admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {invite.roleToAssign === 'super_admin' ? 'Super Admin' : 'Admin'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invite.invitedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invite.expiresAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleRevokeInvite(invite.id, invite.email)}
                        disabled={revoking === invite.id}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {revoking === invite.id ? 'Revoking...' : 'Revoke'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

