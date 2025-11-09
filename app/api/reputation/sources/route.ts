import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { ReviewSource } from '@/libs/reputation-hub/src/types'

/**
 * GET /api/reputation/sources
 * Fetch all review sources for the user
 */
export async function GET(req: NextRequest) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('review_sources')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch review sources: ${error.message}`)
    }

    const sources: ReviewSource[] = (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      platform: row.platform as ReviewSource['platform'],
      platformAccountId: row.platform_account_id,
      platformAccountName: row.platform_account_name,
      reviewLink: row.review_link || null,
      accessToken: row.access_token || null,
      refreshToken: row.refresh_token || null,
      tokenExpiresAt: row.token_expires_at ? new Date(row.token_expires_at) : null,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }))

    return NextResponse.json({ sources })
  } catch (error: any) {
    console.error('Error fetching review sources:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch review sources' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/reputation/sources
 * Create a new review source (for Yelp API key entry)
 */
export async function POST(req: NextRequest) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { platform, platformAccountId, platformAccountName, reviewLink } = body

    if (!platform || !platformAccountId || !platformAccountName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate platform
    if (!['google', 'yelp', 'facebook'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('review_sources')
      .insert({
        user_id: userId,
        platform,
        platform_account_id: platformAccountId,
        platform_account_name: platformAccountName,
        review_link: reviewLink || null,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create review source: ${error.message}`)
    }

    const source: ReviewSource = {
      id: data.id,
      userId: data.user_id,
      platform: data.platform as ReviewSource['platform'],
      platformAccountId: data.platform_account_id,
      platformAccountName: data.platform_account_name,
      reviewLink: data.review_link || null,
      accessToken: data.access_token || null,
      refreshToken: data.refresh_token || null,
      tokenExpiresAt: data.token_expires_at ? new Date(data.token_expires_at) : null,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }

    return NextResponse.json({ source }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating review source:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create review source' },
      { status: 500 }
    )
  }
}

