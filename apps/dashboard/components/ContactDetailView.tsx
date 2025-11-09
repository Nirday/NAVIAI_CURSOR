"use client"

import React, { useState, useEffect } from 'react'
import { Contact, ActivityEvent } from '@/libs/contact-hub/src/types'
import {
  UserPlusIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  EyeIcon,
  LinkIcon,
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  CreditCardIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import CommunicationComposer from './CommunicationComposer'

interface ContactDetailViewProps {
  contactId: string
  userId: string
  onBack?: () => void
  className?: string
}

export default function ContactDetailView({
  contactId,
  userId,
  onBack,
  className = ''
}: ContactDetailViewProps) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendChannel, setSendChannel] = useState<'email' | 'sms' | null>(null)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [generatingSummary, setGeneratingSummary] = useState(false)

  useEffect(() => {
    fetchContact()
    fetchActivities()
  }, [contactId, userId])

  const fetchContact = async () => {
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const data = await res.json()
        setContact(data.contact)
      }
    } catch (error) {
      console.error('Failed to fetch contact:', error)
    }
  }

  const fetchActivities = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/activities`, {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities || [])
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNote = async () => {
    if (!noteText.trim()) return

    setSavingNote(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/activities`, {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventType: 'note',
          content: noteText.trim()
        })
      })

      if (res.ok) {
        setNoteText('')
        fetchActivities()
      } else {
        const error = await res.json()
        alert(`Failed to save note: ${error.error}`)
      }
    } catch (error: any) {
      console.error('Error saving note:', error)
      alert(`Failed to save note: ${error.message}`)
    } finally {
      setSavingNote(false)
    }
  }

  const handleGenerateSummary = async () => {
    if (!contact) return

    setGeneratingSummary(true)
    setSummary(null)
    try {
      const res = await fetch(`/api/contacts/${contactId}/summary`, {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        }
      })

      if (res.ok) {
        const data = await res.json()
        setSummary(data.summary)
        setShowSummaryModal(true)
      } else {
        const error = await res.json()
        alert(`Failed to generate summary: ${error.error}`)
      }
    } catch (error: any) {
      console.error('Error generating summary:', error)
      alert(`Failed to generate summary: ${error.message}`)
    } finally {
      setGeneratingSummary(false)
    }
  }

  const handleSendMessage = async (content: {
    subjectLines: string[]
    selectedSubjects: string[]
    body: string
  }) => {
    if (!contact || !sendChannel) return

    try {
      const res = await fetch(`/api/contacts/${contactId}/send-message`, {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: sendChannel,
          subject: sendChannel === 'email' ? content.selectedSubjects[0] : undefined,
          body: content.body
        })
      })

      if (res.ok) {
        setShowSendModal(false)
        setSendChannel(null)
        fetchActivities()
      } else {
        const error = await res.json()
        alert(`Failed to send message: ${error.error}`)
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      alert(`Failed to send message: ${error.message}`)
    }
  }

  const getEventIcon = (eventType: ActivityEvent['eventType']) => {
    switch (eventType) {
      case 'lead_capture':
        return <UserPlusIcon className="h-5 w-5 text-blue-600" />
      case 'note':
        return <DocumentTextIcon className="h-5 w-5 text-gray-600" />
      case 'email_sent':
        return <EnvelopeIcon className="h-5 w-5 text-green-600" />
      case 'email_opened':
        return <EyeIcon className="h-5 w-5 text-blue-600" />
      case 'link_clicked':
        return <LinkIcon className="h-5 w-5 text-purple-600" />
      case 'sms_sent':
        return <ChatBubbleLeftRightIcon className="h-5 w-5 text-green-600" />
      case 'sms_opened':
        return <DevicePhoneMobileIcon className="h-5 w-5 text-blue-600" />
      case 'billing_status_change':
        return <CreditCardIcon className="h-5 w-5 text-orange-600" />
      case 'phone_call': // V1.5: Phone call event
        return <DevicePhoneMobileIcon className="h-5 w-5 text-indigo-600" />
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-600" />
    }
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const eventDate = new Date(date)
    const diffMs = now.getTime() - eventDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return eventDate.toLocaleDateString()
  }

  // V1.5: Format call duration
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }

  const getTagColor = (tag: string) => {
    if (tag === 'active_customer') return 'bg-green-100 text-green-800'
    if (tag === 'trial_user') return 'bg-blue-100 text-blue-800'
    if (tag === 'canceled_customer') return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  if (loading && !contact) {
    return (
      <div className={`p-6 text-center text-gray-500 ${className}`}>
        Loading contact...
      </div>
    )
  }

  if (!contact) {
    return (
      <div className={`p-6 text-center text-gray-500 ${className}`}>
        Contact not found
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Contacts
        </button>
      )}

      {/* Contact Info Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{contact.name}</h2>
            {contact.isUnsubscribed && (
              <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800 border-2 border-red-300">
                ⚠️ Unsubscribed
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
            <p className="text-sm text-gray-900 mt-1">{contact.email || '-'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Phone</label>
            <p className="text-sm text-gray-900 mt-1">{contact.phone || '-'}</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-gray-500 uppercase block mb-2">Tags</label>
          <div className="flex flex-wrap gap-2">
            {contact.tags.length > 0 ? (
              contact.tags.map((tag) => (
                <span
                  key={tag}
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTagColor(tag)}`}
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-400">No tags</span>
            )}
          </div>
        </div>

        {/* V1.5: Action Buttons */}
        <div className="flex gap-2 mt-4">
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
            >
              <DevicePhoneMobileIcon className="h-4 w-4" />
              Call
            </a>
          )}
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700"
            >
              <EnvelopeIcon className="h-4 w-4" />
              Email
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              setSendChannel('email')
              setShowSendModal(true)
            }}
            disabled={!contact.email || contact.isUnsubscribed}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send Email
          </button>
          <button
            onClick={() => {
              setSendChannel('sms')
              setShowSendModal(true)
            }}
            disabled={!contact.phone || contact.isUnsubscribed}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send SMS
          </button>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
          <button
            onClick={handleGenerateSummary}
            disabled={generatingSummary || activities.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingSummary ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                AI Summarize Activity
              </>
            )}
          </button>
        </div>

        {/* Add Note Input */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add Note
          </label>
          <div className="flex gap-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note about this contact..."
              rows={3}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <button
              onClick={handleSaveNote}
              disabled={!noteText.trim() || savingNote}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed self-start"
            >
              {savingNote ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>

        {/* Activity List */}
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No activity yet.</p>
            <p className="text-sm mt-2">Activity will appear here as you interact with this contact.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-md"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getEventIcon(activity.eventType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-500">
                      {activity.eventType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTimestamp(activity.createdAt)}
                    </span>
                    {/* V1.5: Display call metadata */}
                    {activity.eventType === 'phone_call' && activity.details && (
                      <>
                        {activity.details.duration && (
                          <span className="text-xs text-gray-400">
                            • {formatDuration(activity.details.duration)}
                          </span>
                        )}
                        {activity.details.status && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            activity.details.status === 'answered' ? 'bg-green-100 text-green-700' :
                            activity.details.status === 'missed' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {activity.details.status}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-900">{activity.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send Message Modal */}
      {showSendModal && sendChannel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Send {sendChannel === 'email' ? 'Email' : 'SMS'} to {contact.name}
                </h3>
                <button
                  onClick={() => {
                    setShowSendModal(false)
                    setSendChannel(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <CommunicationComposer
                userId={userId}
                onContentGenerated={(content) => {
                  handleSendMessage(content)
                  setShowSendModal(false)
                  setSendChannel(null)
                }}
                skipAbTest={true} // One-to-one messages don't use A/B testing
              />
            </div>
          </div>
        </div>
      )}

      {/* AI Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">AI Activity Summary</h3>
              <button
                onClick={() => {
                  setShowSummaryModal(false)
                  setSummary(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {summary ? (
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">{summary}</p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Generating summary...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

