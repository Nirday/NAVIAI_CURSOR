import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * PATCH /api/social/conversations/[id]/read
 * Marks all messages in a conversation as read
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify conversation belongs to user
    const { data: conv, error: convError } = await supabaseAdmin
      .from('social_conversations')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()
    
    if (convError || !conv) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Mark all messages as read
    await supabaseAdmin
      .from('social_messages')
      .update({ is_read: true })
      .eq('conversation_id', params.id)
      .eq('sender_type', 'customer')

    // Update conversation unread count to 0
    await supabaseAdmin
      .from('social_conversations')
      .update({
        unread_count: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error marking conversation as read:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to mark conversation as read' },
      { status: 500 }
    )
  }
}

