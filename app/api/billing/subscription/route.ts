import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getSubscription } from '@/libs/billing-hub/src/data'

/**
 * GET /api/billing/subscription
 * Fetches the current subscription for the authenticated user
 */
export async function GET(req: NextRequest) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const subscription = await getSubscription(userId)

    return NextResponse.json({ subscription })
  } catch (error: any) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}

