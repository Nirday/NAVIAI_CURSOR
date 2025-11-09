/**
 * Feature Gating Logic
 * Checks user entitlements based on subscription status and plan
 */

import { getSubscription } from './data'
import { getEntitlementsByPriceId, hasFeature as checkFeature, getLimit as getPlanLimit, FEATURE_MODULES } from './config/entitlements'
import { SubscriptionStatus } from './types'

/**
 * Check if a user has access to a specific feature/module
 * Returns true only if:
 * - User has an active subscription (status: 'active' or 'trialing')
 * - Their plan includes the feature
 */
export async function hasFeatureAccess(userId: string, feature: string): Promise<boolean> {
  const subscription = await getSubscription(userId)

  // No subscription = no access
  if (!subscription) {
    return false
  }

  // Only active and trialing subscriptions have access
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    return false
  }

  // Check if plan includes the feature
  return checkFeature(subscription.stripePriceId, feature)
}

/**
 * Check if a user is within a specific limit
 * Returns true if:
 * - User has an active subscription
 * - Current usage is below the plan limit (or limit is unlimited)
 */
export async function isWithinLimit(
  userId: string,
  limitKey: 'maxContacts' | 'maxReviewsPerMonth' | 'maxSocialConnections' | 'maxBlogPostsPerMonth' | 'maxSeoKeywords' | 'maxSeoCompetitors',
  currentUsage: number
): Promise<boolean> {
  const subscription = await getSubscription(userId)

  // No subscription = not within limit
  if (!subscription) {
    return false
  }

  // Only active and trialing subscriptions count
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    return false
  }

  // Get limit from plan
  const limit = getPlanLimit(subscription.stripePriceId, limitKey)

  // If limit is undefined, no limit applies (allow)
  if (limit === undefined) {
    return true
  }

  // If limit is -1, it's unlimited
  if (limit === -1) {
    return true
  }

  // Check if current usage is below limit
  return currentUsage < limit
}

/**
 * Get the limit value for a user's plan
 * Returns the limit value, or undefined if no limit, or -1 if unlimited
 */
export async function getUserLimit(
  userId: string,
  limitKey: 'maxContacts' | 'maxReviewsPerMonth' | 'maxSocialConnections' | 'maxBlogPostsPerMonth' | 'maxSeoKeywords' | 'maxSeoCompetitors'
): Promise<number | undefined> {
  const subscription = await getSubscription(userId)

  if (!subscription) {
    return undefined
  }

  // Only active and trialing subscriptions have limits
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    return undefined
  }

  return getPlanLimit(subscription.stripePriceId, limitKey)
}

/**
 * Check if user has an active subscription (active or trialing)
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await getSubscription(userId)

  if (!subscription) {
    return false
  }

  return subscription.status === 'active' || subscription.status === 'trialing'
}

/**
 * Get user's subscription status
 */
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus | null> {
  const subscription = await getSubscription(userId)
  return subscription?.status || null
}

/**
 * Get user's plan name
 */
export async function getUserPlanName(userId: string): Promise<string | null> {
  const subscription = await getSubscription(userId)

  if (!subscription) {
    return null
  }

  const entitlement = getEntitlementsByPriceId(subscription.stripePriceId)
  return entitlement?.planName || null
}

/**
 * Get all features available to the user
 */
export async function getUserFeatures(userId: string): Promise<string[]> {
  const subscription = await getSubscription(userId)

  if (!subscription) {
    return []
  }

  // Only active and trialing subscriptions have features
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    return []
  }

  const entitlement = getEntitlementsByPriceId(subscription.stripePriceId)
  return entitlement?.features || []
}

/**
 * Convenience functions for checking specific module access
 */
export async function hasWebsiteModule(userId: string): Promise<boolean> {
  return hasFeatureAccess(userId, FEATURE_MODULES.WEBSITE)
}

export async function hasContactsModule(userId: string): Promise<boolean> {
  return hasFeatureAccess(userId, FEATURE_MODULES.CONTACTS)
}

export async function hasReputationModule(userId: string): Promise<boolean> {
  return hasFeatureAccess(userId, FEATURE_MODULES.REPUTATION)
}

export async function hasContentModule(userId: string): Promise<boolean> {
  return hasFeatureAccess(userId, FEATURE_MODULES.CONTENT)
}

export async function hasSocialModule(userId: string): Promise<boolean> {
  return hasFeatureAccess(userId, FEATURE_MODULES.SOCIAL)
}

export async function hasSeoModule(userId: string): Promise<boolean> {
  return hasFeatureAccess(userId, FEATURE_MODULES.SEO)
}

export async function hasCommunicationModule(userId: string): Promise<boolean> {
  return hasFeatureAccess(userId, FEATURE_MODULES.COMMUNICATION)
}

