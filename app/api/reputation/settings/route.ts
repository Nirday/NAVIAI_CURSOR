import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { ReputationSettings } from '@/libs/reputation-hub/src/types'

/**
 * GET /api/reputation/settings
 * Fetches reputation settings for the user
 */
export async function GET(req: NextRequest) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('reputation_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 means "not found"
      throw error
    }

    if (!data) {
      // Return default settings if none exist
      return NextResponse.json({
        settings: {
          reviewRequestTemplate: 'We\'d love to hear your feedback on your recent service!',
          directReviewLinks: []
        }
      })
    }

    const settings: ReputationSettings = {
      id: data.id,
      userId: data.user_id,
      reviewRequestTemplate: data.review_request_template,
      directReviewLinks: data.direct_review_links || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }

    return NextResponse.json({ settings })
  } catch (error: any) {
    console.error('Error fetching reputation settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reputation settings' },
      { status: 500 }
    )
  }
}

