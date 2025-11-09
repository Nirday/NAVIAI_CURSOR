import { NextRequest, NextResponse } from 'next/server'
import { getOAuthUrl } from '@/libs/connections-hub/src/oauth'

/**
 * GET /api/reputation/oauth/initiate
 * Initiate OAuth flow for review platforms
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const platform = searchParams.get('platform')
  const userId = searchParams.get('userId')

  if (!platform || !userId) {
    return NextResponse.json(
      { error: 'Missing platform or userId' },
      { status: 400 }
    )
  }

  // Validate platform
  if (!['google', 'facebook'].includes(platform)) {
    return NextResponse.json(
      { error: 'Invalid platform. Only Google and Facebook support OAuth.' },
      { status: 400 }
    )
  }

  try {
    // For Facebook, use the existing social OAuth flow but redirect to reputation callback
    if (platform === 'facebook') {
      // Use the connections hub OAuth utility for Facebook
      const oauthUrl = getOAuthUrl('facebook', userId)
      // Note: The callback will need to be updated to handle reputation connections
      // For now, we'll use the same OAuth flow but save to review_sources
      return NextResponse.redirect(oauthUrl)
    }
    
    // V1.5: Google Business Profile OAuth
    if (platform === 'google') {
      const { getGBPOAuthUrl } = await import('@/libs/reputation-hub/src/gbp_oauth')
      const oauthUrl = getGBPOAuthUrl(userId)
      return NextResponse.redirect(oauthUrl)
    }
    
    return NextResponse.json(
      { error: 'Unsupported platform' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error initiating OAuth:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to initiate OAuth' },
      { status: 500 }
    )
  }
}

