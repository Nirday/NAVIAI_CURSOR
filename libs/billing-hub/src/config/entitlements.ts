/**
 * Plan Entitlements Configuration
 * Maps Stripe Price IDs to application features and limits
 * 
 * This is the internal mapping that connects Stripe's billing world
 * to our application's feature gating logic.
 * 
 * IMPORTANT: Stripe is the source of truth for plan names, prices, and billing cycles.
 * This config only defines application-side features and limits.
 */

import { PlanEntitlement } from '../types'

/**
 * Feature Module Identifiers
 */
export const FEATURE_MODULES = {
  WEBSITE: 'MODULE_WEBSITE',
  CONTACTS: 'MODULE_CONTACTS',
  REPUTATION: 'MODULE_REPUTATION',
  CONTENT: 'MODULE_CONTENT',
  SOCIAL: 'MODULE_SOCIAL',
  SEO: 'MODULE_SEO',
  COMMUNICATION: 'MODULE_COMMUNICATION',
  // V1.5 Features
  CALL_TRACKING: 'call_tracking',
  GBP_OFFENSE: 'gbp_offense',
  VOICE_INPUT: 'voice_input'
} as const

/**
 * Plan Entitlements Map
 * 
 * To add a new plan:
 * 1. Create the plan in Stripe and get the price_id
 * 2. Add an entry here with the stripePriceId
 * 3. Define features and limits
 * 
 * Note: Use -1 to represent "Unlimited" for limits
 */
export const ENTITLEMENTS: PlanEntitlement[] = [
  {
    stripePriceId: 'price_starter', // TODO: Replace with actual Stripe Price ID
    planName: 'Starter',
    features: [
      FEATURE_MODULES.WEBSITE,
      FEATURE_MODULES.CONTACTS,
      FEATURE_MODULES.REPUTATION
    ],
    limits: {
      maxContacts: 500,
      maxReviewsPerMonth: 20,
      maxSocialConnections: 1
    }
  },
  {
    stripePriceId: 'price_growth', // TODO: Replace with actual Stripe Price ID
    planName: 'Growth',
    features: [
      FEATURE_MODULES.WEBSITE,
      FEATURE_MODULES.CONTACTS,
      FEATURE_MODULES.REPUTATION,
      FEATURE_MODULES.CONTENT,
      FEATURE_MODULES.SOCIAL,
      // V1.5 Features
      FEATURE_MODULES.CALL_TRACKING,
      FEATURE_MODULES.GBP_OFFENSE,
      FEATURE_MODULES.VOICE_INPUT
    ],
    limits: {
      maxContacts: 1500,
      maxReviewsPerMonth: 50,
      maxSocialConnections: 3,
      maxBlogPostsPerMonth: 4
    }
  },
  {
    stripePriceId: 'price_pro', // TODO: Replace with actual Stripe Price ID
    planName: 'Pro',
    features: [
      FEATURE_MODULES.WEBSITE,
      FEATURE_MODULES.CONTACTS,
      FEATURE_MODULES.REPUTATION,
      FEATURE_MODULES.CONTENT,
      FEATURE_MODULES.SOCIAL,
      FEATURE_MODULES.SEO,
      FEATURE_MODULES.COMMUNICATION,
      // V1.5 Features
      FEATURE_MODULES.CALL_TRACKING,
      FEATURE_MODULES.GBP_OFFENSE,
      FEATURE_MODULES.VOICE_INPUT
    ],
    limits: {
      maxContacts: 5000,
      maxReviewsPerMonth: -1, // Unlimited
      maxSocialConnections: 5,
      maxBlogPostsPerMonth: 8,
      maxSeoKeywords: 10,
      maxSeoCompetitors: 3
    }
  }
]

/**
 * Helper function to get entitlements for a given Stripe Price ID
 */
export function getEntitlementsByPriceId(stripePriceId: string): PlanEntitlement | null {
  return ENTITLEMENTS.find(entitlement => entitlement.stripePriceId === stripePriceId) || null
}

/**
 * Helper function to check if a plan includes a specific feature
 */
export function hasFeature(stripePriceId: string, feature: string): boolean {
  const entitlement = getEntitlementsByPriceId(stripePriceId)
  return entitlement ? entitlement.features.includes(feature) : false
}

/**
 * Helper function to get a limit value for a plan
 */
export function getLimit(stripePriceId: string, limitKey: keyof PlanEntitlement['limits']): number | undefined {
  const entitlement = getEntitlementsByPriceId(stripePriceId)
  return entitlement ? entitlement.limits[limitKey] : undefined
}

