import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'


export const dynamic = 'force-dynamic'
/**
 * GET /api/content/posts
 * Fetches all blog posts for the authenticated user
 */
export async function GET(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const posts = (data || []).map((post: any) => ({
      id: post.id,
      userId: post.user_id,
      title: post.title,
      slug: post.slug,
      status: post.status,
      focusKeyword: post.focus_keyword,
      brandedGraphicUrl: post.branded_graphic_url,
      scheduledAt: post.scheduled_at,
      publishedAt: post.published_at,
      createdAt: post.created_at,
      updatedAt: post.updated_at
    }))

    return NextResponse.json({ posts })
  } catch (error: any) {
    console.error('Error fetching blog posts:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch blog posts' },
      { status: 500 }
    )
  }
}

