import { NextRequest, NextResponse } from 'next/server'
import { runReviewFetcher } from '@/libs/reputation-hub/src/review_fetcher'

/**
 * Review Fetcher Cron Job
 * POST /api/reputation/fetch-reviews
 * 
 * This endpoint runs the review fetcher to fetch new reviews from all platforms
 * Runs every 4 hours for all users with active review sources
 * 
 * Protected by CRON_SECRET environment variable
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error('[Review Fetcher] CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      )
    }
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Run the review fetcher
    await runReviewFetcher()
    
    return NextResponse.json({ success: true, message: 'Review fetcher executed' })
  } catch (error: any) {
    console.error('[Review Fetcher] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to run review fetcher' },
      { status: 500 }
    )
  }
}

