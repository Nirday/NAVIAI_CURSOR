import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getKeywordPerformanceHistory, getLatestKeywordPerformance } from '@/libs/seo-audit/src/keyword_tracker'

/**
 * GET /api/seo/keyword-performance
 * Fetches keyword performance data
 * Query params: days (default: 30), keyword (optional)
 */
export async function GET(req: NextRequest) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = req.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30')
    const keyword = searchParams.get('keyword') || undefined
    const latest = searchParams.get('latest') === 'true'

    if (latest) {
      const performance = await getLatestKeywordPerformance(userId)
      return NextResponse.json({ performance })
    }

    const performance = await getKeywordPerformanceHistory(userId, keyword, days)
    return NextResponse.json({ performance })
  } catch (error: any) {
    console.error('Error fetching keyword performance:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch keyword performance' },
      { status: 500 }
    )
  }
}

