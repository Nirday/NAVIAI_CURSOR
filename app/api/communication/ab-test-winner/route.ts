import { NextRequest, NextResponse } from 'next/server'
import { runAbTestWinnerCheck } from '@/libs/communication-hub/src/engine'

/**
 * A/B Test Winner Check Cron Job
 * POST /api/communication/ab-test-winner
 * 
 * This endpoint checks A/B test results and sends winning variant to remaining audience
 * Runs whenever broadcasts are in 'testing' status and due for winner check
 * 
 * Protected by CRON_SECRET environment variable
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error('[A/B Test Winner Check] CRON_SECRET not configured')
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
    
    // Run the A/B test winner check
    await runAbTestWinnerCheck()
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[A/B Test Winner Check] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to run A/B test winner check' },
      { status: 500 }
    )
  }
}

