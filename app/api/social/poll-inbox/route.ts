import { NextRequest, NextResponse } from 'next/server'
import { runInboxPoller } from '@/libs/social-hub/src/inbox_fetcher'

/**
 * Inbox Poller Cron Job
 * POST /api/social/poll-inbox
 * 
 * This endpoint runs the inbox poller to fetch messages from all platforms
 * Runs every 5 minutes for all users with active connections
 * 
 * Protected by CRON_SECRET environment variable
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error('[Inbox Poller] CRON_SECRET not configured')
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
    
    // Run the inbox poller
    await runInboxPoller()
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Inbox Poller] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to run inbox poller' },
      { status: 500 }
    )
  }
}

