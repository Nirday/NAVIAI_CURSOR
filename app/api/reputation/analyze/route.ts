import { NextRequest, NextResponse } from 'next/server'
import { runReputationAnalysis } from '@/libs/reputation-hub/src/analyzer'

/**
 * Automated Reputation Analysis Cron Job
 * POST /api/reputation/analyze
 *
 * This endpoint runs the reputation analyzer to perform sentiment analysis
 * and identify themes. Runs daily at 6:00 AM UTC.
 *
 * Protected by CRON_SECRET environment variable.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('[Reputation Analyzer Cron] CRON_SECRET not configured')
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

    // Run the reputation analyzer
    await runReputationAnalysis()

    return NextResponse.json({ success: true, message: 'Reputation analysis executed' })
  } catch (error: any) {
    console.error('[Reputation Analyzer Cron] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to run reputation analysis' },
      { status: 500 }
    )
  }
}

