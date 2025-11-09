/**
 * Reputation Management Hub Core Data Structures (Module 8)
 */

export type ReviewPlatform = 'google' | 'yelp' | 'facebook'

/**
 * Review Source
 * Represents a connected review platform account
 */
export interface ReviewSource {
  id: string
  userId: string
  platform: ReviewPlatform
  platformAccountId: string // Platform-specific account/page ID
  platformAccountName: string // Display name of the account/page
  reviewLink?: string | null // Direct link to leave a review
  accessToken?: string | null // Encrypted access token (for OAuth)
  refreshToken?: string | null // Encrypted refresh token (for OAuth)
  tokenExpiresAt?: Date | null // Token expiration timestamp
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Review Status
 * Tracks the lifecycle of review responses
 */
export type ReviewStatus = 
  | 'needs_response'
  | 'response_pending_approval'
  | 'response_changes_requested'
  | 'response_approved'
  | 'response_sent'
  | 'response_failed'

/**
 * Review
 * Represents a single review from a platform
 */
export interface Review {
  id: string
  userId: string
  sourceId: string // Links to ReviewSource
  platform: ReviewPlatform
  platformReviewId: string // Platform-specific review ID (for de-duplication)
  reviewerName: string
  reviewerEmail?: string | null
  rating: number // 1-5 stars
  content: string // Review text
  reviewUrl?: string | null // Direct link to the review
  reviewedAt: Date // When the review was posted
  status: ReviewStatus
  suggestedResponseContent?: string | null // AI-generated response suggestion
  approvalToken?: string | null // UUID token for approval workflow
  approvalTokenExpiresAt?: Date | null // Token expiration (7 days)
  isGoodForShowcasing: boolean // Flagged by AI analysis for marketing use
  responseRetryCount?: number // Number of retry attempts for publishing
  responseErrorMessage?: string | null // Error message if publishing failed
  createdAt: Date
  updatedAt: Date
}

/**
 * Review Response
 * Represents a published response to a review
 */
export interface ReviewResponse {
  id: string
  reviewId: string // Links to Review
  content: string // The actual response text that was posted
  respondedAt: Date // When the response was posted
  platformResponseId?: string | null // Platform-specific response ID (for audit trail)
  createdAt: Date
}

/**
 * Reputation Settings
 * User-specific configuration for reputation management
 */
export interface ReputationSettings {
  id: string
  userId: string
  reviewRequestTemplate: string // Default template for review request messages
  directReviewLinks: Array<{
    platform: ReviewPlatform
    url: string
  }>
  createdAt: Date
  updatedAt: Date
}

/**
 * Reputation Theme
 * AI-identified themes from sentiment analysis
 */
export interface ReputationTheme {
  id: string
  userId: string
  type: 'positive' | 'negative'
  theme: string // e.g., "Excellent service quality"
  count: number // Number of reviews mentioning this theme
  createdAt: Date
}

