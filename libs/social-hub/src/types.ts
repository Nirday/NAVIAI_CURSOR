/**
 * Core Data Structures for AI Social Media Growth Hub
 * Module 5: Social Media Management with multi-platform support
 */

/**
 * Supported social media platforms
 * V1.5: Added google_business for GBP posts
 */
export type SocialPlatform = 'facebook' | 'linkedin' | 'instagram' | 'twitter' | 'google_business'

/**
 * Social Connection
 * Represents a connected social media account
 */
export interface SocialConnection {
  id: string
  userId: string
  platform: SocialPlatform
  platformAccountId: string // Platform-specific account ID
  platformUsername: string // Display username on the platform
  accessToken: string // Encrypted OAuth access token
  refreshToken?: string | null // OAuth refresh token (if available)
  tokenExpiresAt?: Date | null // Token expiration timestamp
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Post Analytics
 * Engagement metrics for a social media post
 */
export interface PostAnalytics {
  postId: string
  platform: SocialPlatform
  likes: number
  comments: number
  shares: number
  clicks: number // Total clicks on the post
  websiteClicks: number | null // Clicks that led to website (from UTM tracking)
  impressions?: number | null // Total impressions (if available)
  engagementRate?: number | null // Calculated engagement rate
  fetchedAt: Date // Last time analytics were fetched
}

/**
 * Social Post
 * Represents a scheduled or published social media post
 */
export interface SocialPost {
  id: string
  userId: string
  connectionId: string // Links to SocialConnection
  platform: SocialPlatform
  content: string
  mediaUrls?: string[] | null // Array of image/video URLs
  scheduledAt?: Date | null // When to publish (null = publish immediately)
  publishedAt?: Date | null // When it was actually published
  platformPostId?: string | null // ID from the platform after publishing
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  analytics?: PostAnalytics | null // Analytics data (fetched after publishing)
  metadata?: Record<string, any> | null // Additional platform-specific data
  createdAt: Date
  updatedAt: Date
}

/**
 * Social Message
 * Represents an individual message in a conversation
 */
export interface SocialMessage {
  id: string
  conversationId: string // Links to SocialConversation
  platformMessageId: string // Platform-specific message ID
  platform: SocialPlatform
  senderId: string // Platform-specific sender ID
  senderName: string // Display name of sender
  senderType: 'user' | 'customer' // Whether message is from us or customer
  content: string
  mediaUrls?: string[] | null // Attachments (images, etc.)
  isRead: boolean
  createdAt: Date // Timestamp from platform
}

/**
 * Social Conversation
 * Represents a conversation thread with a customer
 */
export interface SocialConversation {
  id: string
  userId: string
  connectionId: string // Links to SocialConnection
  platform: SocialPlatform
  conversationType: 'direct_message' | 'comment_thread' // Type of conversation
  platformConversationId: string // Platform-specific conversation ID (customer ID for DMs, post ID for comments)
  customerId: string // Platform-specific customer ID (for DMs) or post ID (for comments)
  customerName: string // Display name of customer (for DMs) or post title (for comments)
  status: 'open' | 'closed'
  lastMessageAt: Date // Timestamp of most recent message
  unreadCount: number
  messages: SocialMessage[] // Related messages
  createdAt: Date
  updatedAt: Date
}

/**
 * Social Idea
 * Proactively generated content ideas for social media
 */
export interface SocialIdea {
  ideaId: string
  userId: string
  title: string
  contentText: string
  imageSuggestion: string // URL or description of suggested image
  status: 'new' | 'used' | 'dismissed'
  createdAt: Date
  updatedAt?: Date | null
}

