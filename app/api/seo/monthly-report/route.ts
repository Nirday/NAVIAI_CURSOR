/**
 * API Route for Monthly SEO Report Generation
 * Triggered by Vercel Cron Job on the first day of every month at 5:00 AM UTC
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateAndSendMonthlyReports } from '@/libs/reporting/src/seo_reporter'

/**
 * POST /api/seo/monthly-report
 * Generates and sends monthly SEO reports to all users
 * 
 * This endpoint should be protected and only callable by Vercel Cron Jobs
 * For V1, we'll use a simple authorization header check
 */
export async function POST(req: NextRequest) {
  try {
    // Verify request is from Vercel Cron (or use a secret token)
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Generate and send monthly reports
    await generateAndSendMonthlyReports()
    
    return NextResponse.json({
      success: true,
      message: 'Monthly SEO reports generated and sent successfully'
    })
  } catch (error: any) {
    console.error('[SEO Monthly Reports API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate monthly reports',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

