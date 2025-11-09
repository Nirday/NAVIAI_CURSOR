/**
 * Call Tracking Onboarding Integration
 * Handles automatic phone number provisioning during user onboarding
 */

import { provisionPhoneNumber } from './twilio_service'
import { createCallTrackingNumber, getCallTrackingNumber } from './data'
import { getSubscription } from '@/libs/billing-hub/src/data'
import { getEntitlementsByPriceId } from '@/libs/billing-hub/src/config/entitlements'

/**
 * Provision phone number for user during onboarding
 * Only provisions if user has Growth or Pro plan
 * Fails silently if provisioning fails (doesn't block onboarding)
 */
export async function provisionPhoneNumberOnboarding(
  userId: string,
  areaCode?: string
): Promise<{ success: boolean; phoneNumber?: string; error?: string }> {
  try {
    // Check if user already has a tracked number
    const existing = await getCallTrackingNumber(userId)
    if (existing) {
      return {
        success: true,
        phoneNumber: existing.twilioPhoneNumber
      }
    }

    // Check user's subscription plan
    const subscription = await getSubscription(userId)
    if (!subscription) {
      // No subscription yet - user might be on trial or free plan
      // Don't provision, but don't error
      return {
        success: false,
        error: 'No active subscription'
      }
    }

    const entitlements = getEntitlementsByPriceId(subscription.stripePriceId)
    if (!entitlements?.features?.includes('call_tracking')) {
      // User doesn't have call tracking feature
      return {
        success: false,
        error: 'Call tracking not available on current plan'
      }
    }

    // Provision phone number from Twilio
    const twilioNumber = await provisionPhoneNumber(userId, areaCode)

    // Save to database
    await createCallTrackingNumber(
      userId,
      twilioNumber.phoneNumber,
      twilioNumber.phoneNumberSid
    )

    return {
      success: true,
      phoneNumber: twilioNumber.phoneNumber
    }
  } catch (error: any) {
    // Fail silently - don't block onboarding
    console.error('[Call Tracking Onboarding] Error provisioning phone number:', error)
    return {
      success: false,
      error: error.message || 'Failed to provision phone number'
    }
  }
}

