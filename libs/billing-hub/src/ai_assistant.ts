/**
 * AI Billing Assistant
 * Answers questions about subscriptions, trials, and billing
 */

import OpenAI from 'openai'
import { getSubscription } from './data'
import { getEntitlementsByPriceId } from './config/entitlements'
import { Subscription } from './types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * Handles billing-related questions from users
 * Answers questions about subscriptions, trials, billing dates, etc.
 * Directs users to Stripe Customer Portal when appropriate
 */
export async function handleBillingQuestion(
  userId: string,
  question: string
): Promise<string> {
  try {
    // Fetch subscription data
    const subscription = await getSubscription(userId)
    
    // Build context for AI
    const subscriptionContext = subscription
      ? buildSubscriptionContext(subscription)
      : 'No active subscription found.'

    const systemPrompt = `You are a helpful Billing Support Assistant for Navi AI. Your role is to answer questions about subscriptions, trials, billing, and payment-related topics in a friendly, clear, and professional manner.

**Key Principles:**
- Be transparent and clear about billing information
- Direct users to the Stripe Customer Portal for actions they can't do in chat (e.g., updating payment method, canceling subscription)
- Use the subscription data provided to give accurate, specific answers
- If you don't have the information, direct them to the billing dashboard or portal

**Available Actions:**
- Answer questions about subscription status, plan details, billing dates, trial periods
- Explain what happens when a trial ends
- Explain billing cycles and renewal dates
- Direct users to manage billing via the Customer Portal (for payment updates, cancellations, etc.)

**Important:** Always mention that users can manage their billing, update payment methods, and view invoices through the "Manage Billing" button in their dashboard, which opens the Stripe Customer Portal.`

    const userPrompt = `**User Question:** ${question}

**Current Subscription Information:**
${subscriptionContext}

**Instructions:**
1. Answer the user's question using the subscription information provided
2. If the question requires actions that must be done in the Stripe Customer Portal (like updating payment method, canceling, viewing invoices), clearly direct them there
3. Be helpful, friendly, and professional
4. If you don't have enough information, suggest they check their billing dashboard

**Response:**`

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    })

    const answer = response.choices[0]?.message?.content?.trim()

    if (!answer) {
      return "I'm having trouble processing your billing question. Please visit your billing dashboard or contact support for assistance."
    }

    return answer
  } catch (error: any) {
    console.error('[Billing Assistant] Error:', error)
    return "I'm having trouble accessing your billing information right now. Please visit your billing dashboard at /dashboard/billing for more information."
  }
}

/**
 * Builds a human-readable context string from subscription data
 */
function buildSubscriptionContext(subscription: Subscription): string {
  const entitlement = getEntitlementsByPriceId(subscription.stripePriceId)
  const planName = entitlement?.planName || 'Unknown Plan'
  
  const statusDescriptions: Record<string, string> = {
    active: 'Active subscription',
    trialing: 'Currently in trial period',
    past_due: 'Payment failed - subscription is past due',
    canceled: 'Subscription has been canceled',
    incomplete: 'Subscription setup incomplete',
    incomplete_expired: 'Subscription setup expired'
  }

  const statusDesc = statusDescriptions[subscription.status] || subscription.status

  let context = `Plan: ${planName}
Status: ${statusDesc}
Next Billing Date: ${subscription.stripeCurrentPeriodEnd.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`

  if (subscription.trialEndsAt) {
    const trialEndDate = subscription.trialEndsAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const daysRemaining = Math.ceil((subscription.trialEndsAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    context += `\nTrial End Date: ${trialEndDate} (${daysRemaining} days remaining)`
  }

  if (entitlement) {
    context += `\n\nPlan Features: ${entitlement.features.join(', ')}`
    const limits = Object.entries(entitlement.limits)
      .map(([key, value]) => `${key.replace('max', '').replace(/([A-Z])/g, ' $1').trim()}: ${value === -1 ? 'Unlimited' : value}`)
      .join(', ')
    if (limits) {
      context += `\nPlan Limits: ${limits}`
    }
  }

  return context
}

