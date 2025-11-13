import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { SocialIdea } from '@/libs/social-hub/src/types'


export const dynamic = 'force-dynamic'
/**
 * GET /api/social/ideas
 * Fetches social ideas for the authenticated user
 * Query params: status (optional, defaults to 'new')
 */
export async function GET(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get('status') || 'new'

    let query = supabaseAdmin
      .from('social_ideas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Filter by status if specified
    if (status === 'new') {
      query = query.eq('status', 'new')
    } else if (status === 'used') {
      query = query.eq('status', 'used')
    } else if (status === 'all') {
      // Get all ideas regardless of status
    } else {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    const ideas: SocialIdea[] = (data || []).map((row: any) => ({
      ideaId: row.idea_id,
      userId: row.user_id,
      title: row.title,
      contentText: row.content_text,
      imageSuggestion: row.image_suggestion,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : null
    }))

    return NextResponse.json({ ideas })
  } catch (error: any) {
    console.error('Error fetching social ideas:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch social ideas' },
      { status: 500 }
    )
  }
}


