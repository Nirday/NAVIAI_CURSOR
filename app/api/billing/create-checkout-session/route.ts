import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createCheckoutSession } from '@/libs/billing-hub/src/checkout'
import { supabaseAdmin } from '@/lib/supabase'


export const dynamic = 'force-dynamic'
/**
 * POST /api/billing/create-checkout-session
 * Creates a Stripe Checkout session for subscription or one-time payment
 */
export async function POST(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { priceId, mode, trialPeriodDays } = await req.json()

    if (!priceId || !mode) {
      return NextResponse.json(
        { error: 'Missing required fields: priceId and mode are required' },
        { status: 400 }
      )
    }

    if (mode !== 'subscription' && mode !== 'payment') {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "subscription" or "payment"' },
        { status: 400 }
      )
    }

    // Fetch user email from auth.users or business_profiles
    let userEmail = ''
    
    // Try to get from auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (!authError && authData?.user?.email) {
      userEmail = authData.user.email
    } else {
      // Fallback: try business_profiles
      const { data: profileData } = await supabaseAdmin
        .from('business_profiles')
        .select('contact_info')
        .eq('user_id', userId)
        .single()

      if (profileData?.contact_info && typeof profileData.contact_info === 'object') {
        const contactInfo = profileData.contact_info as any
        userEmail = contactInfo.email || ''
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found. Please ensure your account has an email address.' },
        { status: 400 }
      )
    }

    // Create checkout session
    const checkoutUrl = await createCheckoutSession(
      userId,
      userEmail,
      priceId,
      mode,
      trialPeriodDays
    )

    return NextResponse.json({ url: checkoutUrl })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

