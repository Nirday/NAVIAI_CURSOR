import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/content/settings
 * Fetches content settings for the authenticated user
 */
export async function GET() {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('content_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found, return defaults
        return NextResponse.json({
          settings: {
            userId: userId,
            primaryBusinessGoalCta: null,
            frequency: 'weekly',
            targetPlatforms: ['linkedin', 'facebook', 'twitter', 'instagram'],
            isEnabled: false
          }
        })
      }
      throw error
    }

    return NextResponse.json({
      settings: {
        userId: data.user_id,
        primaryBusinessGoalCta: data.primary_business_goal_cta,
        frequency: data.frequency,
        targetPlatforms: data.target_platforms,
        isEnabled: data.is_enabled,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    })
  } catch (error: any) {
    console.error('Error fetching content settings:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch content settings' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/content/settings
 * Updates content settings for the authenticated user
 */
export async function POST(req: NextRequest) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { primaryBusinessGoalCta, frequency, targetPlatforms, isEnabled } = body

    const payload: any = {}
    if (primaryBusinessGoalCta !== undefined) payload.primary_business_goal_cta = primaryBusinessGoalCta
    if (frequency !== undefined) payload.frequency = frequency
    if (targetPlatforms !== undefined) payload.target_platforms = targetPlatforms
    if (isEnabled !== undefined) payload.is_enabled = isEnabled

    const { data, error } = await supabaseAdmin
      .from('content_settings')
      .upsert({
        user_id: userId,
        ...payload
      }, { onConflict: 'user_id' })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating content settings:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update content settings' },
      { status: 500 }
    )
  }
}

