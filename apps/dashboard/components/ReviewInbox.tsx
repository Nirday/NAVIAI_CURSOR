"use client"

import React, { useState, useEffect } from 'react'
import { Review, ReviewPlatform, ReviewStatus } from '@/libs/reputation-hub/src/types'
import { 
  StarIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  XCircleIcon,
  PencilIcon,
  GlobeAltIcon,
  ShareIcon,
  EyeIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface ReviewInboxProps {
  userId: string
  className?: string
  onGenerateResponse?: (reviewId: string) => void
  onShowcaseAction?: (reviewId: string, action: 'website' | 'social') => void
}

export default function ReviewInbox({
  userId,
  className = '',
  onGenerateResponse,
  onShowcaseAction
}: ReviewInboxProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<{
    status: ReviewStatus | null
    platform: ReviewPlatform | null
    rating: number | null
  }>({
    status: null,
    platform: null,
    rating: null
  })
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null)
  const [manualReplyText, setManualReplyText] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchReviews()
  }, [userId, filters])

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.platform) params.append('platform', filters.platform)
      if (filters.rating !== null) params.append('rating', filters.rating.toString())

      const res = await fetch(`/api/reputation/reviews?${params.toString()}`, {
        headers: { 'x-user-id': userId }
      })
      
      if (res.ok) {
        const json = await res.json()
        setReviews(json.reviews || [])
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: ReviewStatus) => {
    const statusConfig = {
      needs_response: { color: 'bg-red-100 text-red-800', label: 'Needs Response', icon: ClockIcon },
      response_pending_approval: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Approval', icon: ClockIcon },
      response_changes_requested: { color: 'bg-orange-100 text-orange-800', label: 'Changes Requested', icon: PencilIcon },
      response_approved: { color: 'bg-blue-100 text-blue-800', label: 'Approved', icon: CheckCircleIcon },
      response_sent: { color: 'bg-green-100 text-green-800', label: 'Sent', icon: CheckCircleIcon },
      response_failed: { color: 'bg-red-100 text-red-800', label: 'Failed', icon: XCircleIcon }
    }

    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    )
  }

  const getPlatformIcon = (platform: ReviewPlatform) => {
    switch (platform) {
      case 'google': return '🔍'
      case 'yelp': return '⭐'
      case 'facebook': return '📘'
      default: return '📝'
    }
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const reviewDate = new Date(date)
    const diffMs = now.getTime() - reviewDate.getTime()
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return reviewDate.toLocaleDateString()
  }

  const canReply = (status: ReviewStatus) => {
    return status === 'needs_response' || status === 'response_changes_requested'
  }

  const getStatusMessage = (status: ReviewStatus) => {
    switch (status) {
      case 'response_pending_approval':
        return 'This response is pending approval via email.'
      case 'response_approved':
        return 'This response has been approved and will be sent soon.'
      case 'response_sent':
        return 'This response has been sent to the platform.'
      case 'response_failed':
        return 'Failed to send response. Please try again.'
      default:
        return null
    }
  }

  const handleGenerateResponse = async (reviewId: string) => {
    if (onGenerateResponse) {
      onGenerateResponse(reviewId)
      return
    }

    // Call API to generate response and send approval notification
    try {
      const res = await fetch(`/api/reputation/reviews/${reviewId}/generate-response`, {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        }
      })

      if (res.ok) {
        // Refresh reviews to show updated status
        await fetchReviews()
        alert('AI response generated! Check your email/SMS for approval.')
      } else {
        const error = await res.json()
        alert(`Failed to generate response: ${error.error}`)
      }
    } catch (error: any) {
      console.error('Error generating response:', error)
      alert(`Failed to generate response: ${error.message}`)
    }
  }

  const handleShowcaseAction = async (reviewId: string, action: 'website' | 'social') => {
    if (onShowcaseAction) {
      onShowcaseAction(reviewId, action)
      return
    }

    // Call API to trigger showcase action
    try {
      const res = await fetch(`/api/reputation/reviews/${reviewId}/showcase`, {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ actionType: action })
      })

      if (res.ok) {
        const data = await res.json()
        // Show success notification
        alert(data.message || `Review ${action === 'website' ? 'sent to your website' : 'draft created in your Social Hub'}!`)
      } else {
        const error = await res.json()
        // Show error notification
        alert(`Error: ${error.error || 'Could not showcase review. Please try again.'}`)
      }
    } catch (error: any) {
      console.error('Error showcasing review:', error)
      alert(`Error: Could not showcase review. Please try again.`)
    }
  }

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">Loading reviews...</div>
      </div>
    )
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Review Inbox</h3>
        <p className="text-sm text-gray-500">
          Manage and respond to reviews from all platforms in one place.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as ReviewStatus || null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="needs_response">Needs Response</option>
              <option value="response_pending_approval">Pending Approval</option>
              <option value="response_changes_requested">Changes Requested</option>
              <option value="response_approved">Approved</option>
              <option value="response_sent">Sent</option>
              <option value="response_failed">Failed</option>
            </select>
          </div>

          {/* Platform Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
            <select
              value={filters.platform || ''}
              onChange={(e) => setFilters({ ...filters, platform: e.target.value as ReviewPlatform || null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Platforms</option>
              <option value="google">Google</option>
              <option value="yelp">Yelp</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>

          {/* Rating Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            <select
              value={filters.rating !== null ? filters.rating.toString() : ''}
              onChange={(e) => setFilters({ ...filters, rating: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(filters.status || filters.platform || filters.rating !== null) && (
          <button
            onClick={() => setFilters({ status: null, platform: null, rating: null })}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No reviews found. {Object.values(filters).some(v => v !== null) && 'Try adjusting your filters.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const isExpanded = expandedReviewId === review.id
            const canReplyToThis = canReply(review.status)
            const statusMessage = getStatusMessage(review.status)

            return (
              <div
                key={review.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                {/* Review Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="text-2xl">{getPlatformIcon(review.platform)}</div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{review.reviewerName}</h4>
                        {getStatusBadge(review.status)}
                        <span className="text-sm text-gray-500 capitalize">{review.platform}</span>
                        <span className="text-sm text-gray-500">{formatDate(review.reviewedAt)}</span>
                      </div>
                      
                      {/* Rating */}
                      <div className="flex items-center space-x-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          star <= review.rating ? (
                            <StarIconSolid key={star} className="h-5 w-5 text-yellow-400" />
                          ) : (
                            <StarIcon key={star} className="h-5 w-5 text-gray-300" />
                          )
                        ))}
                        <span className="ml-2 text-sm text-gray-600">{review.rating} stars</span>
                      </div>

                      {/* Review Content */}
                      <p className="text-gray-700 mb-3">{review.content || '(No review text)'}</p>

                      {/* Suggested Response Preview */}
                      {review.suggestedResponseContent && (
                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <p className="text-xs font-medium text-blue-800 mb-1">Suggested Response:</p>
                          <p className="text-sm text-blue-900">{review.suggestedResponseContent}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-3">
                    {canReplyToThis ? (
                      <>
                        <button
                          onClick={() => handleGenerateResponse(review.id)}
                          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                          <SparklesIcon className="h-4 w-4" />
                          <span>AI Suggest</span>
                        </button>
                        <button
                          onClick={() => setExpandedReviewId(isExpanded ? null : review.id)}
                          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                        >
                          <PencilIcon className="h-4 w-4" />
                          <span>Reply Manually</span>
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">{statusMessage}</p>
                    )}
                    
                    {review.reviewUrl && (
                      <a
                        href={review.reviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        <EyeIcon className="h-4 w-4" />
                        <span>View Original</span>
                      </a>
                    )}
                  </div>

                  {/* Showcase Buttons */}
                  {review.isGoodForShowcasing && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleShowcaseAction(review.id, 'website')}
                        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100"
                      >
                        <GlobeAltIcon className="h-4 w-4" />
                        <span>Add to Website</span>
                      </button>
                      <button
                        onClick={() => handleShowcaseAction(review.id, 'social')}
                        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100"
                      >
                        <ShareIcon className="h-4 w-4" />
                        <span>Share on Social</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Manual Reply Box */}
                {isExpanded && canReplyToThis && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manual Reply
                    </label>
                    <textarea
                      value={manualReplyText[review.id] || ''}
                      onChange={(e) => setManualReplyText({ ...manualReplyText, [review.id]: e.target.value })}
                      placeholder="Type your response here..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex justify-end space-x-3 mt-3">
                      <button
                        onClick={() => {
                          setExpandedReviewId(null)
                          setManualReplyText({ ...manualReplyText, [review.id]: '' })
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          // TODO: Implement manual reply submission (Task 8.5)
                          console.log('Submit manual reply:', manualReplyText[review.id])
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                      >
                        Send Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

