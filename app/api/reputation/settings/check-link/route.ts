import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { ReviewPlatform } from '@/libs/reputation-hub/src/types'


export const dynamic = 'force-dynamic'
/**
 * GET /api/reputation/settings/check-link?platform=google
 * Checks if a review link exists for the specified platform
 */
export async function GET(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = req.nextUrl.searchParams
    const platform = searchParams.get('platform') as ReviewPlatform

    if (!platform || !['google', 'yelp', 'facebook'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      )
    }

    // Fetch reputation settings
    const { data: settingsData, error: settingsError } = await supabaseAdmin
      .from('reputation_settings')
      .select('direct_review_links')
      .eq('user_id', userId)
      .single()

    if (settingsError || !settingsData) {
      return NextResponse.json({ hasLink: false })
    }

    const reviewLinks = settingsData.direct_review_links || []
    const platformLink = reviewLinks.find((link: any) => link.platform === platform)

    return NextResponse.json({
      hasLink: !!platformLink && !!platformLink.url
    })
  } catch (error: any) {
    console.error('[Review Settings API] Error checking link:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check review link' },
      { status: 500 }
    )
  }
}

