'use client'

import { useState, useEffect } from 'react'

interface SeoOpportunity {
  id: string
  title: string
  description: string
  suggestedAction: string
  status: 'pending_review' | 'approved' | 'rejected'
}

export default function OpportunityReview() {
  const [opportunities, setOpportunities] = useState<SeoOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    fetchOpportunities()
  }, [])

  const fetchOpportunities = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/seo-opportunities')
      if (!res.ok) {
        throw new Error('Failed to fetch opportunities')
      }
      const data = await res.json()
      setOpportunities(data.opportunities || [])
      setPendingCount(data.opportunities?.length || 0)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to load opportunities' })
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (opportunityId: string, action: 'approved' | 'rejected') => {
    try {
      setProcessing(opportunityId)
      setMessage(null)

      const res = await fetch(`/api/admin/seo-opportunities/${opportunityId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || `Failed to ${action === 'approved' ? 'approve' : 'reject'} opportunity`)
      }

      // Remove from list immediately
      setOpportunities(prev => prev.filter(opp => opp.id !== opportunityId))
      setPendingCount(prev => prev - 1)

      // Show success message
      setMessage({
        type: 'success',
        text: `Opportunity ${action === 'approved' ? 'approved' : 'rejected'} successfully`
      })

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to process review' })
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading opportunities...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          SEO Opportunities Review
          {pendingCount > 0 && (
            <span className="ml-3 text-lg font-normal text-gray-600">
              ({pendingCount} pending)
            </span>
          )}
        </h1>
        <p className="text-gray-600 mt-1">Review and approve AI-generated SEO opportunities</p>
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

      {/* Opportunities List */}
      {opportunities.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">No pending opportunities</p>
          <p className="text-gray-400 text-sm mt-2">All opportunities have been reviewed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opportunity) => (
            <div
              key={opportunity.id}
              className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {opportunity.title}
                  </h3>
                  <p className="text-gray-700 mb-4">{opportunity.description}</p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-1">Implementation Details:</p>
                    <p className="text-gray-800">{opportunity.suggestedAction}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-4">
                <button
                  onClick={() => handleReview(opportunity.id, 'approved')}
                  disabled={processing === opportunity.id}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processing === opportunity.id ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleReview(opportunity.id, 'rejected')}
                  disabled={processing === opportunity.id}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processing === opportunity.id ? 'Processing...' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

