import { NextRequest, NextResponse } from 'next/server'
import { runResponsePublisher } from '@/libs/reputation-hub/src/response_publisher'

/**
 * Response Publisher Cron Job
 * POST /api/reputation/publish-responses
 *
 * This endpoint runs the response publisher to post approved review responses to platforms.
 * Runs every 5 minutes.
 *
 * Protected by CRON_SECRET environment variable.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error('[Response Publisher Cron] CRON_SECRET not configured')
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
    
    // Run the response publisher
    await runResponsePublisher()
    
    return NextResponse.json({ success: true, message: 'Response publisher executed' })
  } catch (error: any) {
    console.error('[Response Publisher Cron] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to run response publisher' },
      { status: 500 }
    )
  }
}

