/**
 * API Route for Initiating OAuth Flow
 * GET /api/social/oauth/initiate?platform=facebook&userId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { getOAuthUrl } from '@/libs/connections-hub/src/oauth'
import { SocialPlatform } from '@/libs/social-hub/src/types'

/**
 * GET /api/social/oauth/initiate
 * Initiates OAuth flow by redirecting to platform's authorization page
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const platform = searchParams.get('platform') as SocialPlatform
    const userId = searchParams.get('userId')
    
    if (!platform || !['facebook', 'linkedin', 'instagram', 'twitter'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid or missing platform parameter' },
        { status: 400 }
      )
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      )
    }
    
    // Generate OAuth URL
    const authUrl = getOAuthUrl(platform, userId)
    
    // Redirect to platform's OAuth page
    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error('[OAuth Initiate] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to initiate OAuth flow' },
      { status: 500 }
    )
  }
}

