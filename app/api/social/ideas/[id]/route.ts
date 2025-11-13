import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { SocialIdea } from '@/libs/social-hub/src/types'


export const dynamic = 'force-dynamic'
/**
 * PATCH /api/social/ideas/[id]
 * Updates idea status (use or dismiss)
 */
export async function PATCH(
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
    const body = await req.json()
    const { status } = body
    const ideaId = id

    if (!status || !['used', 'dismissed'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be "used" or "dismissed"' },
        { status: 400 }
      )
    }

    // Update the idea status
    const { data, error } = await supabaseAdmin
      .from('social_ideas')
      .update({ status })
      .eq('idea_id', ideaId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Idea not found' },
          { status: 404 }
        )
      }
      throw error
    }

    const idea: SocialIdea = {
      ideaId: data.idea_id,
      userId: data.user_id,
      title: data.title,
      contentText: data.content_text,
      imageSuggestion: data.image_suggestion,
      status: data.status,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : null
    }

    return NextResponse.json({ idea })
  } catch (error: any) {
    console.error('Error updating idea status:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update idea status' },
      { status: 500 }
    )
  }
}

