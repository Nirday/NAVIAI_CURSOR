import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createReviewRequestCampaign } from '@/libs/reputation-hub/src/review_campaign'
import { ReviewPlatform } from '@/libs/reputation-hub/src/types'

/**
 * POST /api/reputation/campaigns/create
 * Creates a review request campaign with review gating flow
 */
export async function POST(req: NextRequest) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { platform, tags, messageTemplate, channel } = body

    // Validate required fields
    if (!platform || !['google', 'yelp', 'facebook'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be google, yelp, or facebook.' },
        { status: 400 }
      )
    }

    if (!channel || !['email', 'sms'].includes(channel)) {
      return NextResponse.json(
        { error: 'Invalid channel. Must be email or sms.' },
        { status: 400 }
      )
    }

    if (!messageTemplate || typeof messageTemplate !== 'string' || !messageTemplate.trim()) {
      return NextResponse.json(
        { error: 'Message template is required.' },
        { status: 400 }
      )
    }

    if (!Array.isArray(tags)) {
      return NextResponse.json(
        { error: 'Tags must be an array.' },
        { status: 400 }
      )
    }

    // Create the campaign
    const broadcastId = await createReviewRequestCampaign(
      userId,
      platform as ReviewPlatform,
      tags,
      messageTemplate.trim(),
      channel
    )

    return NextResponse.json({
      success: true,
      broadcastId,
      message: 'Review request campaign created successfully!'
    })
  } catch (error: any) {
    console.error('[Review Campaign API] Error creating campaign:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create review request campaign' },
      { status: 500 }
    )
  }
}

