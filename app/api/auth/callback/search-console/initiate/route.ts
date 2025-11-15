import { NextRequest, NextResponse } from 'next/server'
import { getSearchConsoleOAuthUrl } from '@/libs/connections-hub/src/search_console_oauth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/callback/search-console/initiate
 * Initiate Google Search Console OAuth flow
 * V1.5: Website editor Google Bot Ping integration
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json(
      { error: 'Missing userId parameter' },
      { status: 400 }
    )
  }

  try {
    const oauthUrl = getSearchConsoleOAuthUrl(userId)
    return NextResponse.redirect(oauthUrl)
  } catch (error: any) {
    console.error('Error initiating Search Console OAuth:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to initiate OAuth' },
      { status: 500 }
    )
  }
}

