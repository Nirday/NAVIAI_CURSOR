import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { getSubscription } from '@/libs/billing-hub/src/data'


export const dynamic = 'force-dynamic'

// Lazy initialization to avoid errors when API key is not set
let stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    }
    stripe = new Stripe(apiKey, { apiVersion: '2025-10-29.clover' })
  }
  return stripe
}

/**
 * GET /api/billing/portal
 * Creates a Stripe Customer Portal session and returns the URL
 */
export async function GET(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get subscription to find customer ID
    const subscription = await getSubscription(userId)

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    // Create portal session
    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing`
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Error creating portal session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    )
  }
}

