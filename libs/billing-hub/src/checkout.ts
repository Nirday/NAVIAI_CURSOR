/**
 * Stripe Checkout Integration
 * Securely creates checkout sessions for subscriptions and one-time payments
 */

import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia'
})

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Get or create Stripe customer for a user
 * Returns the stripeCustomerId
 */
async function getOrCreateCustomer(userId: string, userEmail: string): Promise<string> {
  // Check if user already has a stripeCustomerId in subscriptions table
  const { data: subData } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (subData?.stripe_customer_id) {
    return subData.stripe_customer_id
  }

  // Check if customer exists in Stripe by email (in case it was created but not saved to DB)
  const existingCustomers = await stripe.customers.list({
    email: userEmail,
    limit: 1
  })

  if (existingCustomers.data.length > 0) {
    const existingCustomer = existingCustomers.data[0]
    // Verify it has our userId in metadata
    if (existingCustomer.metadata?.userId === userId) {
      // Save it to our database for future lookups
      // It will be saved when subscription/payment is created via webhook
      return existingCustomer.id
    }
  }

  // No existing customer - create one in Stripe
  const customer = await stripe.customers.create({
    email: userEmail,
    metadata: {
      userId: userId
    }
  })

  // Customer ID will be saved to database when subscription/payment is created via webhook
  // For now, we just return it
  return customer.id
}

/**
 * Check if user is eligible for a trial
 * Returns true only if user has no existing Stripe customer
 * (i.e., they've never made a payment or subscription before)
 */
async function isEligibleForTrial(userId: string, userEmail: string): Promise<boolean> {
  // Check if user has a subscription record (which means they have a customer)
  const { data: subData } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (subData?.stripe_customer_id) {
    return false // User already has a customer, not eligible for trial
  }

  // Check if user has any one-time payments
  const { data: paymentData } = await supabaseAdmin
    .from('one_time_payments')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (paymentData?.stripe_customer_id) {
    return false // User has made payments before, not eligible for trial
  }

  // Check if customer exists in Stripe by email
  const existingCustomers = await stripe.customers.list({
    email: userEmail,
    limit: 1
  })

  if (existingCustomers.data.length > 0) {
    // Customer exists in Stripe, not eligible for trial
    return false
  }

  // No existing customer - eligible for trial
  return true
}

/**
 * Create Stripe Checkout Session
 * 
 * @param userId - Internal user ID
 * @param userEmail - User's email address
 * @param priceId - Stripe Price ID
 * @param mode - 'subscription' or 'payment'
 * @param trialPeriodDays - Optional trial period (only for new customers)
 * @returns Stripe Checkout Session URL
 */
export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  priceId: string,
  mode: 'subscription' | 'payment',
  trialPeriodDays?: number
): Promise<string> {
  // Get or create Stripe customer
  const customerId = await getOrCreateCustomer(userId, userEmail)

  // Check trial eligibility for subscriptions
  let finalTrialPeriodDays: number | undefined = undefined
  if (mode === 'subscription' && trialPeriodDays !== undefined) {
    const eligible = await isEligibleForTrial(userId, userEmail)
    if (eligible) {
      finalTrialPeriodDays = trialPeriodDays
    }
  }

  // Build subscription_data if this is a subscription
  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData | undefined = 
    mode === 'subscription' && finalTrialPeriodDays !== undefined
      ? {
          trial_period_days: finalTrialPeriodDays
        }
      : mode === 'subscription'
      ? {}
      : undefined

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: mode,
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    subscription_data: subscriptionData,
    success_url: `${APP_DOMAIN}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_DOMAIN}/dashboard/billing?canceled=true`,
    client_reference_id: userId, // Critical for webhook handler
    metadata: {
      userId: userId,
      mode: mode
    }
  })

  if (!session.url) {
    throw new Error('Failed to create checkout session - no URL returned')
  }

  return session.url
}

