import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { Review, ReviewPlatform, ReviewStatus } from '@/libs/reputation-hub/src/types'

/**
 * GET /api/reputation/reviews
 * Fetch reviews for the user with optional filtering
 */
export async function GET(req: NextRequest) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get('status') as ReviewStatus | null
    const platform = searchParams.get('platform') as ReviewPlatform | null
    const rating = searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : null

    let query = supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('user_id', userId)
      .order('reviewed_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (platform) {
      query = query.eq('platform', platform)
    }
    if (rating !== null) {
      query = query.eq('rating', rating)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch reviews: ${error.message}`)
    }

    const reviews: Review[] = (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      sourceId: row.source_id,
      platform: row.platform as ReviewPlatform,
      platformReviewId: row.platform_review_id,
      reviewerName: row.reviewer_name,
      reviewerEmail: row.reviewer_email || null,
      rating: row.rating,
      content: row.content,
      reviewUrl: row.review_url || null,
      reviewedAt: new Date(row.reviewed_at),
      status: row.status as ReviewStatus,
      suggestedResponseContent: row.suggested_response_content || null,
      approvalToken: row.approval_token || null,
      approvalTokenExpiresAt: row.approval_token_expires_at ? new Date(row.approval_token_expires_at) : null,
      isGoodForShowcasing: row.is_good_for_showcasing,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }))

    return NextResponse.json({ reviews })
  } catch (error: any) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

