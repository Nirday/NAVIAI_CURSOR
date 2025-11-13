import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { SocialPost } from '@/libs/social-hub/src/types'


export const dynamic = 'force-dynamic'
/**
 * GET /api/social/posts
 * Fetches social posts for the authenticated user
 * Query params: status (optional), platform (optional), startDate, endDate
 */
export async function GET(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get('status')
    const platform = searchParams.get('platform')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let query = supabaseAdmin
      .from('social_posts')
      .select('*, social_connections(platform_username)')
      .eq('user_id', userId)
      .order('scheduled_at', { ascending: true, nullsLast: true })

    if (status) {
      query = query.eq('status', status)
    }

    if (platform) {
      query = query.eq('platform', platform)
    }

    if (startDate) {
      query = query.gte('scheduled_at', startDate)
    }

    if (endDate) {
      query = query.lte('scheduled_at', endDate)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    const posts: SocialPost[] = (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      connectionId: row.connection_id,
      platform: row.platform,
      content: row.content,
      mediaUrls: row.media_urls || null,
      scheduledAt: row.scheduled_at ? new Date(row.scheduled_at) : null,
      publishedAt: row.published_at ? new Date(row.published_at) : null,
      platformPostId: row.platform_post_id || null,
      status: row.status,
      analytics: null, // Will be fetched separately if needed
      metadata: row.metadata || null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }))

    return NextResponse.json({ posts })
  } catch (error: any) {
    console.error('Error fetching social posts:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch social posts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/social/posts
 * Creates a new social post (draft or scheduled)
 */
export async function POST(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { content, platform, status, scheduledAt, mediaUrls } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    if (!platform || !['facebook', 'linkedin', 'instagram', 'twitter'].includes(platform)) {
      return NextResponse.json(
        { error: 'Valid platform is required' },
        { status: 400 }
      )
    }

    if (!status || !['draft', 'scheduled'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be "draft" or "scheduled"' },
        { status: 400 }
      )
    }

    if (status === 'scheduled' && !scheduledAt) {
      return NextResponse.json(
        { error: 'Scheduled date/time is required for scheduled posts' },
        { status: 400 }
      )
    }

    // Get user's connection for this platform (or use first active connection)
    // For V1, we'll use the first active connection for the platform
    const { data: connections, error: connError } = await supabaseAdmin
      .from('social_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('is_active', true)
      .limit(1)

    if (connError || !connections || connections.length === 0) {
      return NextResponse.json(
        { error: `No active connection found for ${platform}. Please connect your account first.` },
        { status: 400 }
      )
    }

    const connectionId = connections[0].id

    // Insert the post
    const { data: postData, error: postError } = await supabaseAdmin
      .from('social_posts')
      .insert({
        user_id: userId,
        connection_id: connectionId,
        platform,
        content,
        media_urls: mediaUrls || null,
        status,
        scheduled_at: scheduledAt || null
      })
      .select()
      .single()

    if (postError) {
      throw postError
    }

    const post: SocialPost = {
      id: postData.id,
      userId: postData.user_id,
      connectionId: postData.connection_id,
      platform: postData.platform,
      content: postData.content,
      mediaUrls: postData.media_urls || null,
      scheduledAt: postData.scheduled_at ? new Date(postData.scheduled_at) : null,
      publishedAt: postData.published_at ? new Date(postData.published_at) : null,
      platformPostId: postData.platform_post_id || null,
      status: postData.status,
      analytics: null,
      metadata: postData.metadata || null,
      createdAt: new Date(postData.created_at),
      updatedAt: new Date(postData.updated_at)
    }

    return NextResponse.json({ post })
  } catch (error: any) {
    console.error('Error creating social post:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create social post' },
      { status: 500 }
    )
  }
}

