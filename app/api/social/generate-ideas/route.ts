/**
 * API Route for Social Idea Generation
 * Triggered by Vercel Cron Job every Monday at 2:00 AM UTC
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateSocialIdeas } from '@/libs/social-hub/src/idea_engine'

/**
 * POST /api/social/generate-ideas
 * Generates social media ideas for all users with active connections
 * 
 * This endpoint should be protected and only callable by Vercel Cron Jobs
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
    
    // Generate ideas for all users
    await generateSocialIdeas()
    
    return NextResponse.json({
      success: true,
      message: 'Social media ideas generated successfully'
    })
  } catch (error: any) {
    console.error('[Social Ideas API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate social ideas',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

