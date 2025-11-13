import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { provisionPhoneNumber } from '@/libs/call-tracking/src/twilio_service'
import { createCallTrackingNumber, getCallTrackingNumber } from '@/libs/call-tracking/src/data'
import { getSubscription } from '@/libs/billing-hub/src/data'
import { getEntitlementsByPriceId } from '@/libs/billing-hub/src/config/entitlements'


export const dynamic = 'force-dynamic'
/**
 * POST /api/call-tracking/provision
 * Provision a tracked phone number for the user
 * Requires Growth or Pro plan
 */
export async function POST(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if user already has a tracked number
    const existing = await getCallTrackingNumber(userId)
    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Phone number already provisioned',
        phoneNumber: existing.twilioPhoneNumber,
        phoneNumberSid: existing.twilioPhoneNumberSid
      })
    }

    // Check user's subscription plan
    const subscription = await getSubscription(userId)
    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription. Call tracking requires Growth or Pro plan.' },
        { status: 403 }
      )
    }

    const entitlements = getEntitlementsByPriceId(subscription.stripePriceId)
    if (!entitlements?.features?.includes('call_tracking')) {
      return NextResponse.json(
        { error: 'Call tracking is not available on your current plan. Upgrade to Growth or Pro.' },
        { status: 403 }
      )
    }

    // Get optional area code from request
    const body = await req.json().catch(() => ({}))
    const areaCode = body.areaCode

    // Provision phone number from Twilio
    const twilioNumber = await provisionPhoneNumber(userId, areaCode)

    // Save to database
    const trackingNumber = await createCallTrackingNumber(
      userId,
      twilioNumber.phoneNumber,
      twilioNumber.phoneNumberSid
    )

    return NextResponse.json({
      success: true,
      message: 'Phone number provisioned successfully',
      phoneNumber: trackingNumber.twilioPhoneNumber,
      phoneNumberSid: trackingNumber.twilioPhoneNumberSid,
      formattedPhoneNumber: twilioNumber.phoneNumber // Can format for display
    })
  } catch (error: any) {
    console.error('[Call Tracking] Error provisioning phone number:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to provision phone number' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/call-tracking/provision
 * Get user's tracked phone number
 */
export async function GET(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const trackingNumber = await getCallTrackingNumber(userId)
    
    if (!trackingNumber) {
      return NextResponse.json(
        { error: 'No tracked phone number found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      phoneNumber: trackingNumber.twilioPhoneNumber,
      phoneNumberSid: trackingNumber.twilioPhoneNumberSid,
      isActive: trackingNumber.isActive
    })
  } catch (error: any) {
    console.error('[Call Tracking] Error fetching phone number:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch phone number' },
      { status: 500 }
    )
  }
}

