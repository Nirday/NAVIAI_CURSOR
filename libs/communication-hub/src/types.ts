/**
 * Core Data Structures for AI Communication & Automation Hub
 * Module 6: Email/SMS Communication with A/B Testing and Automation
 */

import { Contact } from '@/libs/contact-hub/src/types'

/**
 * Audience
 * Represents a filtered group of contacts for targeting
 */
export interface Audience {
  id: string
  userId: string
  name: string
  description?: string | null
  contactIds: string[] // Array of contact IDs
  filterTags?: string[] | null // Tags used to filter contacts
  createdAt: Date
  updatedAt: Date
}

/**
 * Communication Settings
 * User-specific settings for email/SMS communications
 */
export interface CommunicationSettings {
  id: string
  userId: string
  primaryCta: string // Primary call-to-action text (e.g., "Call now for a free estimate!")
  defaultFromEmail?: string | null // Default sender email address
  defaultFromName?: string | null // Default sender name
  replyToEmail?: string | null // Reply-to email address
  createdAt: Date
  updatedAt: Date
}

/**
 * Broadcast Content Version
 * Represents a single content variant for A/B testing
 */
export interface BroadcastContentVersion {
  variant: 'A' | 'B' // Variant identifier
  subject: string // Subject line (different for A/B testing)
  body: string // Body content (same for both variants in V1)
}

/**
 * A/B Test Configuration
 * Configuration for A/B testing in broadcasts
 */
export interface AbTestConfig {
  testSizePercentage: number // Percentage of total audience to test (e.g., 20%)
  variantASize: number // Percentage of test audience for variant A (default: 50%)
  variantBSize: number // Percentage of test audience for variant B (default: 50%)
  testDurationHours?: number | null // How long to run the test before sending winning variant
  winnerVariant?: 'A' | 'B' | null // Winning variant determined after test
}

/**
 * Broadcast
 * Represents a one-time email/SMS broadcast with optional A/B testing
 */
export interface Broadcast {
  id: string
  userId: string
  audienceId: string // Links to Audience
  channel: 'email' | 'sms' // Communication channel
  content: BroadcastContentVersion[] // Array of content versions (A and B variants)
  abTestConfig?: AbTestConfig | null // A/B test configuration (null if no A/B test)
  type?: 'standard' | 'review_request' // Broadcast type (default: 'standard')
  status: 'draft' | 'scheduled' | 'testing' | 'sending' | 'sent' | 'failed'
  scheduledAt?: Date | null // When to send (null = send immediately)
  sentAt?: Date | null // When it was actually sent
  totalRecipients: number // Total number of recipients
  sentCount: number // Number of messages successfully sent
  failedCount: number // Number of failed sends
  openCount?: number | null // Email opens (if channel is email)
  clickCount?: number | null // Link clicks
  createdAt: Date
  updatedAt: Date
}

/**
 * Automation Step
 * A single step in an automation sequence
 */
export interface AutomationStep {
  id: string
  sequenceId: string // Links to AutomationSequence
  order: number // Step order (0-based)
  action: 'send_email' | 'send_sms' | 'wait'
  subject?: string | null // Email subject (for send_email)
  body?: string | null // Email/SMS body content
  waitDays?: number | null // Number of days to wait (for wait action)
  executedAt?: Date | null // When this step was executed
  createdAt: Date
}

/**
 * Automation Sequence
 * A sequence of automated communications triggered by an event
 */
export interface AutomationSequence {
  id: string
  userId: string
  name: string
  description?: string | null
  triggerType: 'new_lead_added' // Trigger type (only 'new_lead_added' for V1)
  steps: AutomationStep[] // Array of automation steps
  isActive: boolean // Whether the sequence is currently active
  totalExecutions: number // Total number of times sequence has been triggered
  createdAt: Date
  updatedAt: Date
}

/**
 * Broadcast Analytics
 * Detailed analytics for a broadcast
 */
export interface BroadcastAnalytics {
  broadcastId: string
  totalSent: number
  totalOpened?: number | null // Email opens
  totalClicked?: number | null // Link clicks
  totalReplied?: number | null // Replies
  openRate?: number | null // Percentage (email only)
  clickRate?: number | null // Percentage
  replyRate?: number | null // Percentage
  variantAStats?: {
    sent: number
    opened?: number | null
    clicked?: number | null
    openRate?: number | null
    clickRate?: number | null
  } | null
  variantBStats?: {
    sent: number
    opened?: number | null
    clicked?: number | null
    openRate?: number | null
    clickRate?: number | null
  } | null
  fetchedAt: Date
}

