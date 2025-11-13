import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'


export const dynamic = 'force-dynamic'
/**
 * GET /api/content/posts/[id]
 * Fetches a single blog post with full content
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    const post = {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      slug: data.slug,
      contentMarkdown: data.content_markdown,
      seoMetadata: data.seo_metadata,
      focusKeyword: data.focus_keyword,
      brandedGraphicUrl: data.branded_graphic_url,
      repurposedAssets: data.repurposed_assets,
      status: data.status,
      approvalToken: data.approval_token,
      scheduledAt: data.scheduled_at,
      publishedAt: data.published_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }

    return NextResponse.json({ post })
  } catch (error: any) {
    console.error('Error fetching blog post:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch blog post' },
      { status: 500 }
    )
  }
}

