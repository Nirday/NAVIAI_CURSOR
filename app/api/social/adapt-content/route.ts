import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { adaptContentForPlatform } from '@/libs/social-hub/src/adapter'
import { BusinessProfile } from '@/libs/chat-core/src/types'


export const dynamic = 'force-dynamic'
/**
 * POST /api/social/adapt-content
 * Adapts content for Instagram or Twitter using AI
 */
export async function POST(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { content, platform, profile } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    if (platform !== 'instagram' && platform !== 'twitter') {
      return NextResponse.json(
        { error: 'Platform must be "instagram" or "twitter"' },
        { status: 400 }
      )
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Business profile is required' },
        { status: 400 }
      )
    }

    const adaptedContent = await adaptContentForPlatform(
      content,
      platform,
      profile as BusinessProfile
    )

    return NextResponse.json({ adaptedContent })
  } catch (error: any) {
    console.error('Error adapting content:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to adapt content' },
      { status: 500 }
    )
  }
}

