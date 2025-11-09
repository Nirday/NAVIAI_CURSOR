/**
 * Billing & Subscription Hub Core Data Structures (Module 9)
 */

/**
 * Subscription Status
 * Represents the current state of a subscription in Stripe
 */
export type SubscriptionStatus = 
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'

/**
 * Plan Entitlement
 * Maps a Stripe price ID to application features and limits
 */
export interface PlanEntitlement {
  stripePriceId: string // Stripe Price ID (e.g., 'price_1234567890')
  planName: string // Display name (e.g., 'Starter', 'Growth', 'Pro')
  features: string[] // Array of enabled module/feature identifiers
  limits: {
    maxContacts?: number // -1 for unlimited
    maxReviewsPerMonth?: number // -1 for unlimited
    maxSocialConnections?: number
    maxBlogPostsPerMonth?: number
    maxSeoKeywords?: number
    maxSeoCompetitors?: number
  }
}

/**
 * Subscription
 * Local cached representation of a user's billing status
 * Stripe is the source of truth; this is updated via webhooks
 */
export interface Subscription {
  id: string
  userId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  stripePriceId: string // Links to plan via ENTITLEMENTS map
  stripeCurrentPeriodEnd: Date
  status: SubscriptionStatus
  trialEndsAt: Date | null // Null if no trial
  createdAt: Date
  updatedAt: Date
}

/**
 * One-Time Payment
 * Represents a completed one-time purchase (not a subscription)
 */
export interface OneTimePayment {
  id: string
  userId: string
  stripeCustomerId: string
  stripePaymentIntentId: string
  stripeProductId: string
  amount: number // Amount in cents
  currency: string // e.g., 'usd'
  status: 'succeeded' | 'failed' | 'pending'
  createdAt: Date
}

