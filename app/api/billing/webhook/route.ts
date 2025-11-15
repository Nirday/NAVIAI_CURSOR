import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { upsertSubscription, createOneTimePayment } from '@/libs/billing-hub/src/data'
import { SubscriptionStatus } from '@/libs/billing-hub/src/types'
import { sendTrialEndingEmail, sendPaymentFailedEmail } from '@/libs/communication-hub/src/system_emails'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover'
})

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

/**
 * POST /api/billing/webhook
 * Handles Stripe webhook events
 */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET)
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message)
    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    )
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle checkout.session.completed event
 * Processes both subscription and one-time payment completions
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id

  if (!userId) {
    console.error('No client_reference_id in checkout session')
    return
  }

  const mode = session.mode

  if (mode === 'subscription') {
    // Handle subscription
    const subscriptionId = session.subscription as string
    if (!subscriptionId) {
      console.error('No subscription ID in checkout session')
      return
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    await saveSubscription(userId, subscription)
    
    // Get or create contact and update tags
    const customerId = subscription.customer as string
    await getOrCreateContact(userId, customerId)
    await updateContactTags(userId, subscription.status as SubscriptionStatus, customerId)
  } else if (mode === 'payment') {
    // Handle one-time payment
    const paymentIntentId = session.payment_intent as string
    if (!paymentIntentId) {
      console.error('No payment_intent in checkout session')
      return
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    await saveOneTimePayment(userId, session.customer as string, paymentIntent)
  }
}

/**
 * Handle customer.subscription.created event
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const userId = await getUserIdFromCustomer(customerId)
  if (!userId) return

  await saveSubscription(userId, subscription)
  await updateContactTags(userId, subscription.status as SubscriptionStatus, customerId)
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const userId = await getUserIdFromCustomer(customerId)
  if (!userId) return

  await saveSubscription(userId, subscription)
  await updateContactTags(userId, subscription.status as SubscriptionStatus, customerId)
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const userId = await getUserIdFromCustomer(customerId)
  if (!userId) return

  // Update subscription status to canceled
  await saveSubscription(userId, subscription)
  await updateContactTags(userId, 'canceled', customerId)
}

/**
 * Handle invoice.payment_succeeded event
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // @ts-expect-error - Property 'subscription' does exist on webhook invoice objects
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return // Not a subscription invoice

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const customerId = subscription.customer as string
  const userId = await getUserIdFromCustomer(customerId)
  if (!userId) return

  await saveSubscription(userId, subscription)
  await updateContactTags(userId, subscription.status as SubscriptionStatus, customerId)
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // @ts-expect-error - Property 'subscription' does exist on webhook invoice objects
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return // Not a subscription invoice

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const customerId = subscription.customer as string
  const userId = await getUserIdFromCustomer(customerId)
  if (!userId) return

  await saveSubscription(userId, subscription)
  await updateContactTags(userId, subscription.status as SubscriptionStatus, customerId)
  
  // Send payment failed email
  try {
    await sendPaymentFailedEmail(userId)
  } catch (error: any) {
    console.error(`[Webhook] Error sending payment failed email to user ${userId}:`, error)
    // Don't throw - email failure shouldn't break webhook processing
  }
}

/**
 * Handle customer.subscription.trial_will_end event
 */
async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const userId = await getUserIdFromCustomer(customerId)
  if (!userId) return

  // Update subscription record (trial end date may have changed)
  await saveSubscription(userId, subscription)
  
  // Send trial ending email
  try {
    await sendTrialEndingEmail(userId)
  } catch (error: any) {
    console.error(`[Webhook] Error sending trial ending email to user ${userId}:`, error)
    // Don't throw - email failure shouldn't break webhook processing
  }
}

/**
 * Save or update subscription record
 */
async function saveSubscription(userId: string, subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id
  if (!priceId) {
    throw new Error('No price ID found in subscription')
  }

  const status = mapStripeStatusToSubscriptionStatus(subscription.status)
  const trialEndsAt = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
  // @ts-expect-error - Property 'current_period_end' does exist on webhook subscription objects
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000)

  await upsertSubscription({
    userId,
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    stripeCurrentPeriodEnd: currentPeriodEnd,
    status,
    trialEndsAt
  })
}

/**
 * Save one-time payment record
 */
async function saveOneTimePayment(
  userId: string,
  customerId: string,
  paymentIntent: Stripe.PaymentIntent
) {
  // Get product ID from payment intent metadata or line items
  let productId = paymentIntent.metadata?.product_id || ''

  // If no product_id in metadata, try to get from invoice
  // @ts-expect-error - Property 'invoice' does exist on webhook payment_intent objects
  if (!productId && paymentIntent.invoice) {
    // @ts-expect-error - Property 'invoice' does exist on webhook payment_intent objects
    const invoice = await stripe.invoices.retrieve(paymentIntent.invoice as string)
    if (invoice.lines.data.length > 0) {
      const lineItem = invoice.lines.data[0]
      // @ts-expect-error - Property 'price' does exist on webhook line_item objects
      if (lineItem.price?.product) {
        // @ts-expect-error - Property 'price' does exist on webhook line_item objects
        productId = lineItem.price.product as string
      }
    }
  }

  await createOneTimePayment({
    userId,
    stripeCustomerId: customerId,
    stripePaymentIntentId: paymentIntent.id,
    stripeProductId: productId || 'unknown',
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: paymentIntent.status === 'succeeded' ? 'succeeded' : paymentIntent.status === 'failed' ? 'failed' : 'pending'
  })

  // Get or create contact for one-time payment
  await getOrCreateContact(userId, customerId)
}

/**
 * Get userId from Stripe customer ID
 */
async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  // Check subscriptions table
  const { data: subData } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .limit(1)
    .single()

  if (subData?.user_id) {
    return subData.user_id
  }

  // Check one-time payments table
  const { data: paymentData } = await supabaseAdmin
    .from('one_time_payments')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .limit(1)
    .single()

  if (paymentData?.user_id) {
    return paymentData.user_id
  }

  // Try to get from Stripe customer metadata
  try {
    const customer = await stripe.customers.retrieve(customerId)
    if (!customer.deleted && customer.metadata?.userId) {
      return customer.metadata.userId
    }
  } catch (error) {
    console.error('Error retrieving customer from Stripe:', error)
  }

  return null
}

/**
 * Get or create contact for a user
 */
async function getOrCreateContact(userId: string, customerId: string): Promise<void> {
  // Get customer from Stripe
  let customer: Stripe.Customer | Stripe.DeletedCustomer
  try {
    customer = await stripe.customers.retrieve(customerId)
    if (customer.deleted) {
      return
    }
  } catch (error) {
    console.error('Error retrieving customer:', error)
    return
  }

  const customerEmail = (customer as Stripe.Customer).email
  const customerName = (customer as Stripe.Customer).name || (customer as Stripe.Customer).email?.split('@')[0] || 'Customer'

  if (!customerEmail) {
    console.error('No email found for customer')
    return
  }

  // Check if contact exists
  const { data: existingContact } = await supabaseAdmin
    .from('contacts')
    .select('id, tags')
    .eq('user_id', userId)
    .eq('email', customerEmail)
    .single()

  if (existingContact) {
    // Contact exists, no need to create
    return
  }

  // Create new contact
  const { error: createError } = await supabaseAdmin
    .from('contacts')
    .insert({
      user_id: userId,
      name: customerName,
      email: customerEmail,
      tags: [],
      is_unsubscribed: false
    })

  if (createError) {
    console.error('Error creating contact:', createError)
  }
}

/**
 * Update contact tags based on subscription status
 */
async function updateContactTags(userId: string, status: SubscriptionStatus, customerId?: string): Promise<void> {
  // Get user email
  const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId)
  const email = authData?.user?.email
  const userEmail = (email && typeof email === 'string') ? email : null

  if (!userEmail) {
    console.error('No email found for user')
    return
  }

  // Get contact
  let contact = await supabaseAdmin
    .from('contacts')
    .select('id, tags')
    .eq('user_id', userId)
    .eq('email', userEmail)
    .single()

  // If contact doesn't exist and we have customerId, create it
  if (contact.error && customerId) {
    await getOrCreateContact(userId, customerId)
    // Re-fetch contact
    contact = await supabaseAdmin
      .from('contacts')
      .select('id, tags')
      .eq('user_id', userId)
      .eq('email', userEmail)
      .single()
  }

  if (contact.error || !contact.data) {
    console.error('Contact not found and could not be created')
    return
  }

  await applyTagChanges(contact.data.id, userId, status, contact.data.tags || [])
}

/**
 * Apply tag changes based on status
 */
async function applyTagChanges(
  contactId: string,
  userId: string,
  status: SubscriptionStatus,
  currentTags: string[]
): Promise<void> {
  const billingTags = ['active_customer', 'trial_user', 'canceled_customer']
  const otherTags = currentTags.filter(tag => !billingTags.includes(tag))

  let newTags: string[] = []
  let statusChangeMessage: string | null = null

  if (status === 'trialing') {
    newTags = [...otherTags, 'trial_user']
    if (!currentTags.includes('trial_user')) {
      statusChangeMessage = "Subscription trial started."
    }
  } else if (status === 'active') {
    newTags = [...otherTags, 'active_customer']
    if (!currentTags.includes('active_customer')) {
      statusChangeMessage = "Subscription status changed to 'active'."
    }
  } else if (status === 'canceled') {
    newTags = [...otherTags, 'canceled_customer']
    if (!currentTags.includes('canceled_customer')) {
      statusChangeMessage = "Subscription canceled."
    }
  } else {
    // For other statuses (past_due, incomplete, etc.), don't change tags
    // Just remove conflicting billing tags
    newTags = otherTags
  }

  // Only update if tags actually changed
  const tagsChanged = JSON.stringify(newTags.sort()) !== JSON.stringify(currentTags.sort())

  if (tagsChanged) {
    // Update tags
    const { error: updateError } = await supabaseAdmin
      .from('contacts')
      .update({
        tags: newTags,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId)

    if (updateError) {
      console.error('Error updating contact tags:', updateError)
      return
    }

    // Log activity event if status changed
    if (statusChangeMessage) {
      await supabaseAdmin
        .from('activity_events')
        .insert({
          user_id: userId,
          contact_id: contactId,
          event_type: 'billing_status_change',
          content: statusChangeMessage
        })
        .catch(error => {
          console.error('Error logging billing status change:', error)
        })
    }
  }
}

/**
 * Map Stripe subscription status to our SubscriptionStatus type
 */
function mapStripeStatusToSubscriptionStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
      return 'past_due'
    case 'canceled':
    case 'unpaid':
      return 'canceled'
    case 'incomplete':
      return 'incomplete'
    case 'incomplete_expired':
      return 'incomplete_expired'
    default:
      return 'active' // Default fallback
  }
}

