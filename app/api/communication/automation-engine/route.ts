import { NextRequest, NextResponse } from 'next/server'
import { runAutomationEngine } from '@/libs/communication-hub/src/engine'

/**
 * Automation Engine Cron Job
 * POST /api/communication/automation-engine
 * 
 * This endpoint processes contacts due for next automation step
 * Runs frequently (e.g., every 5 minutes) to process automation sequences
 * 
 * Protected by CRON_SECRET environment variable
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error('[Automation Engine] CRON_SECRET not configured')
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
    
    // Run the automation engine
    await runAutomationEngine()
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Automation Engine] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to run automation engine' },
      { status: 500 }
    )
  }
}

