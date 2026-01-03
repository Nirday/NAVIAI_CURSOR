import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { getAnalyticsSummary } from '../../../../libs/website-builder/src/analytics-utils'


export const dynamic = 'force-dynamic'
async function getAuthenticatedUserId(): Promise<string | null> {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  return userId && userId.length > 0 ? userId : null
}

export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get user's Plausible API key from settings
    const { data, error } = await supabaseAdmin
      .from('analytics_settings')
      .select('plausible_api_key')
      .eq('user_id', userId)
      .single()

    if (error || !data?.plausible_api_key) {
      return NextResponse.json(
        { error: 'Analytics not configured. Please add your Plausible API key in settings.' },
        { status: 400 }
      )
    }

    // Get website domain for querying
    const { data: websiteData } = await supabaseAdmin
      .from('websites')
      .select('published_domain')
      .eq('user_id', userId)
      .eq('status', 'published')
      .single()

    if (!websiteData?.published_domain) {
      return NextResponse.json(
        { error: 'No published website found.' },
        { status: 400 }
      )
    }

    const summary = await getAnalyticsSummary(
      data.plausible_api_key,
      websiteData.published_domain
    )

    return NextResponse.json({ summary })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Failed to fetch analytics summary' },
      { status: 500 }
    )
  }
}

