import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * PATCH /api/social/conversations/[id]/close
 * Closes or reopens a conversation
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { status } = body // 'open' | 'closed'

    // Verify conversation belongs to user and get current status
    const { data: conv, error: convError } = await supabaseAdmin
      .from('social_conversations')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    
    if (convError || !conv) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Determine new status: if status provided, use it; otherwise toggle
    let newStatus: 'open' | 'closed'
    if (status && ['open', 'closed'].includes(status)) {
      newStatus = status
    } else {
      // Toggle current status
      newStatus = conv.status === 'open' ? 'closed' : 'open'
    }

    // Update conversation status
    const { error: updateError } = await supabaseAdmin
      .from('social_conversations')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      throw new Error(`Failed to update conversation: ${updateError.message}`)
    }

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error: any) {
    console.error('Error updating conversation status:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update conversation status' },
      { status: 500 }
    )
  }
}

