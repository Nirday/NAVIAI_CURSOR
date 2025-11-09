/**
 * System Transactional Emails
 * Low-level email sending for automated system notifications
 * (e.g., trial ending, payment failed)
 */

import { sendEmail } from './email_service'
import { getSubscription } from '../../billing-hub/src/data'
import { getEntitlementsByPriceId } from '../../billing-hub/src/config/entitlements'
import { supabaseAdmin } from '@/lib/supabase'

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Sends a transactional email directly (not via Broadcast system)
 */
async function sendTransactionalEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  await sendEmail(to, subject, html)
}

/**
 * Get user's email from auth.users table
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (error || !data?.user?.email) {
      return null
    }
    return data.user.email
  } catch (error) {
    console.error('Error fetching user email:', error)
    return null
  }
}

/**
 * Get Stripe Customer Portal URL for a user
 * Returns the billing dashboard URL where users can access the portal
 * (Portal session creation requires authentication, so we link to the dashboard)
 */
async function getPortalUrl(userId: string): Promise<string | null> {
  try {
    const subscription = await getSubscription(userId)
    if (!subscription) {
      return null
    }

    // Link to billing dashboard - users can click "Manage Billing" to access portal
    return `${APP_DOMAIN}/dashboard/billing`
  } catch (error) {
    console.error('Error getting portal URL:', error)
    return null
  }
}

/**
 * Sends trial ending soon email
 * Triggered by customer.subscription.trial_will_end webhook
 */
export async function sendTrialEndingEmail(userId: string): Promise<void> {
  try {
    const userEmail = await getUserEmail(userId)
    if (!userEmail) {
      console.error(`[Trial Ending Email] No email found for user ${userId}`)
      return
    }

    // Get subscription and plan details
    const subscription = await getSubscription(userId)
    if (!subscription || !subscription.trialEndsAt) {
      console.error(`[Trial Ending Email] No trial subscription found for user ${userId}`)
      return
    }

    const entitlement = getEntitlementsByPriceId(subscription.stripePriceId)
    const planName = entitlement?.planName || 'your plan'
    const trialEndDate = subscription.trialEndsAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Get user's name (try from business profile)
    let userName = 'there'
    try {
      const { data: profileData } = await supabaseAdmin
        .from('business_profiles')
        .select('business_name')
        .eq('user_id', userId)
        .single()

      if (profileData?.business_name) {
        userName = profileData.business_name
      }
    } catch (error) {
      // Use default if profile not found
    }

    // Get portal URL
    const portalUrl = await getPortalUrl(userId)
    const manageBillingLink = portalUrl || `${APP_DOMAIN}/dashboard/billing`

    const subject = `Your Navi AI trial ends soon - ${trialEndDate}`
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 30px;">
          <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">Your Trial Ends Soon</h1>
          
          <p style="color: #4b5563; font-size: 16px; margin-bottom: 16px;">
            Hi ${userName},
          </p>
          
          <p style="color: #4b5563; font-size: 16px; margin-bottom: 16px;">
            This is a friendly reminder that your Navi AI trial for the <strong>${planName}</strong> plan will end on <strong>${trialEndDate}</strong>.
          </p>
          
          <p style="color: #4b5563; font-size: 16px; margin-bottom: 16px;">
            Your subscription will automatically renew after the trial period. If you'd like to update your payment method or make any changes to your subscription, you can do so anytime.
          </p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${manageBillingLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Manage Billing
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            If you have any questions, feel free to reach out to our support team.
          </p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">
            Best regards,<br>
            The Navi AI Team
          </p>
        </div>
      </body>
      </html>
    `

    await sendTransactionalEmail(userEmail, subject, html)
    console.log(`[Trial Ending Email] Sent trial ending email to user ${userId}`)
  } catch (error: any) {
    console.error(`[Trial Ending Email] Error sending email to user ${userId}:`, error)
    throw error
  }
}

/**
 * Sends payment failed email
 * Triggered by invoice.payment_failed webhook
 */
export async function sendPaymentFailedEmail(userId: string): Promise<void> {
  try {
    const userEmail = await getUserEmail(userId)
    if (!userEmail) {
      console.error(`[Payment Failed Email] No email found for user ${userId}`)
      return
    }

    // Get subscription and plan details
    const subscription = await getSubscription(userId)
    if (!subscription) {
      console.error(`[Payment Failed Email] No subscription found for user ${userId}`)
      return
    }

    const entitlement = getEntitlementsByPriceId(subscription.stripePriceId)
    const planName = entitlement?.planName || 'your plan'

    // Get user's name (try from business profile)
    let userName = 'there'
    try {
      const { data: profileData } = await supabaseAdmin
        .from('business_profiles')
        .select('business_name')
        .eq('user_id', userId)
        .single()

      if (profileData?.business_name) {
        userName = profileData.business_name
      }
    } catch (error) {
      // Use default if profile not found
    }

    // Get portal URL
    const portalUrl = await getPortalUrl(userId)
    const manageBillingLink = portalUrl || `${APP_DOMAIN}/dashboard/billing`

    const subject = 'Action Required: Update Your Payment Method'
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 30px;">
          <h1 style="color: #dc2626; font-size: 24px; margin-bottom: 20px;">⚠️ Payment Failed</h1>
          
          <p style="color: #4b5563; font-size: 16px; margin-bottom: 16px;">
            Hi ${userName},
          </p>
          
          <p style="color: #4b5563; font-size: 16px; margin-bottom: 16px;">
            We were unable to process the payment for your <strong>${planName}</strong> subscription. This may be due to an expired card, insufficient funds, or another payment issue.
          </p>
          
          <p style="color: #4b5563; font-size: 16px; margin-bottom: 16px;">
            <strong>To continue using Navi AI without interruption, please update your payment method as soon as possible.</strong>
          </p>
          
          <p style="color: #4b5563; font-size: 16px; margin-bottom: 16px;">
            Stripe will automatically retry the payment. If the retry also fails, you may lose access to your account.
          </p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${manageBillingLink}" style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Update Payment Method
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            If you have any questions or need assistance, please contact our support team.
          </p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">
            Best regards,<br>
            The Navi AI Team
          </p>
        </div>
      </body>
      </html>
    `

    await sendTransactionalEmail(userEmail, subject, html)
    console.log(`[Payment Failed Email] Sent payment failed email to user ${userId}`)
  } catch (error: any) {
    console.error(`[Payment Failed Email] Error sending email to user ${userId}:`, error)
    throw error
  }
}

