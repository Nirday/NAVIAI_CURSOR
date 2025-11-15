/**
 * Billing Hub Data Access Layer
 * Functions for reading/writing subscription data
 */

import { supabaseAdmin } from '@/lib/supabase'
import { Subscription, OneTimePayment, SubscriptionStatus } from './types'

/**
 * Get subscription for a user
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null
    }
    throw new Error(`Failed to fetch subscription: ${error.message}`)
  }

  if (!data) {
    return null
  }

  return {
    id: data.id,
    userId: data.user_id,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    stripePriceId: data.stripe_price_id,
    stripeCurrentPeriodEnd: new Date(data.stripe_current_period_end),
    status: data.status as SubscriptionStatus,
    trialEndsAt: data.trial_ends_at ? new Date(data.trial_ends_at) : null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  }
}

/**
 * Create or update subscription
 * Used by webhook handler
 */
export async function upsertSubscription(subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription> {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id: subscription.userId,
      stripe_customer_id: subscription.stripeCustomerId,
      stripe_subscription_id: subscription.stripeSubscriptionId,
      stripe_price_id: subscription.stripePriceId,
      stripe_current_period_end: subscription.stripeCurrentPeriodEnd.toISOString(),
      status: subscription.status,
      trial_ends_at: subscription.trialEndsAt ? subscription.trialEndsAt.toISOString() : null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: false
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to upsert subscription: ${error.message}`)
  }

  return {
    id: data.id,
    userId: data.user_id,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    stripePriceId: data.stripe_price_id,
    stripeCurrentPeriodEnd: new Date(data.stripe_current_period_end),
    status: data.status as SubscriptionStatus,
    trialEndsAt: data.trial_ends_at ? new Date(data.trial_ends_at) : null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  }
}

/**
 * Delete subscription (e.g., when canceled)
 */
export async function deleteSubscription(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .delete()
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to delete subscription: ${error.message}`)
  }
}

/**
 * Create one-time payment record
 */
export async function createOneTimePayment(payment: Omit<OneTimePayment, 'id' | 'createdAt'>): Promise<OneTimePayment> {
  const { data, error } = await supabaseAdmin
    .from('one_time_payments')
    .insert({
      user_id: payment.userId,
      stripe_customer_id: payment.stripeCustomerId,
      stripe_payment_intent_id: payment.stripePaymentIntentId,
      stripe_product_id: payment.stripeProductId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create one-time payment: ${error.message}`)
  }

  return {
    id: data.id,
    userId: data.user_id,
    stripeCustomerId: data.stripe_customer_id,
    stripePaymentIntentId: data.stripe_payment_intent_id,
    stripeProductId: data.stripe_product_id,
    amount: data.amount,
    currency: data.currency,
    status: data.status as 'succeeded' | 'failed' | 'pending',
    createdAt: new Date(data.created_at)
  }
}

/**
 * Get one-time payments for a user
 */
export async function getOneTimePayments(userId: string): Promise<OneTimePayment[]> {
  const { data, error } = await supabaseAdmin
    .from('one_time_payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch one-time payments: ${error.message}`)
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    userId: p.user_id,
    stripeCustomerId: p.stripe_customer_id,
    stripePaymentIntentId: p.stripe_payment_intent_id,
    stripeProductId: p.stripe_product_id,
    amount: p.amount,
    currency: p.currency,
    status: p.status as 'succeeded' | 'failed' | 'pending',
    createdAt: new Date(p.created_at)
  }))
}

