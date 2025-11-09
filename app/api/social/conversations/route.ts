import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { SocialConversation, SocialMessage } from '@/libs/social-hub/src/types'

/**
 * GET /api/social/conversations
 * Fetches all conversations for the authenticated user
 * 
 * Query params:
 * - status: 'open' | 'closed' (optional, defaults to 'open')
 */
export async function GET(req: NextRequest) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get('status') || 'open'

    // Fetch conversations
    const { data: conversations, error: convError } = await supabaseAdmin
      .from('social_conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('status', status)
      .order('last_message_at', { ascending: false })
    
    if (convError) {
      throw new Error(`Failed to fetch conversations: ${convError.message}`)
    }

    // Fetch messages for each conversation
    const conversationsWithMessages: (SocialConversation & { messages: SocialMessage[] })[] = []
    
    for (const conv of conversations || []) {
      const { data: messages, error: msgError } = await supabaseAdmin
        .from('social_messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true })
      
      if (msgError) {
        console.error(`Failed to fetch messages for conversation ${conv.id}:`, msgError)
        continue
      }

      const formattedMessages: SocialMessage[] = (messages || []).map(msg => ({
        id: msg.id,
        conversationId: msg.conversation_id,
        platformMessageId: msg.platform_message_id,
        platform: msg.platform,
        senderId: msg.sender_id,
        senderName: msg.sender_name,
        senderType: msg.sender_type,
        content: msg.content,
        mediaUrls: msg.media_urls,
        isRead: msg.is_read,
        createdAt: new Date(msg.created_at)
      }))

      const formattedConv: SocialConversation & { messages: SocialMessage[] } = {
        id: conv.id,
        userId: conv.user_id,
        connectionId: conv.connection_id,
        platform: conv.platform,
        conversationType: conv.conversation_type,
        platformConversationId: conv.platform_conversation_id,
        customerId: conv.customer_id,
        customerName: conv.customer_name,
        status: conv.status,
        lastMessageAt: new Date(conv.last_message_at),
        unreadCount: conv.unread_count,
        messages: formattedMessages,
        createdAt: new Date(conv.created_at),
        updatedAt: new Date(conv.updated_at)
      }

      conversationsWithMessages.push(formattedConv)
    }

    return NextResponse.json({ conversations: conversationsWithMessages })
  } catch (error: any) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

