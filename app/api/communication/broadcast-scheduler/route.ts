import { NextRequest, NextResponse } from 'next/server'
import { runBroadcastScheduler } from '@/libs/communication-hub/src/engine'

/**
 * Broadcast Scheduler Cron Job
 * POST /api/communication/broadcast-scheduler
 * 
 * This endpoint runs the broadcast scheduler to process due broadcasts
 * Runs every 1 minute for all users with scheduled broadcasts
 * 
 * Protected by CRON_SECRET environment variable
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error('[Broadcast Scheduler] CRON_SECRET not configured')
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
    
    // Run the broadcast scheduler
    await runBroadcastScheduler()
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Broadcast Scheduler] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to run broadcast scheduler' },
      { status: 500 }
    )
  }
}

