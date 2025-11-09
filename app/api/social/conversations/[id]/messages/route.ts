import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptToken } from '@/libs/connections-hub/src/encryption'

/**
 * POST /api/social/conversations/[id]/messages
 * Sends a reply message to a conversation
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { content } = body

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    // Fetch conversation and connection
    const { data: conv, error: convError } = await supabaseAdmin
      .from('social_conversations')
      .select(`
        *,
        social_connections (
          id,
          platform,
          platform_account_id,
          access_token
        )
      `)
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()
    
    if (convError || !conv) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const connection = conv.social_connections
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    // Decrypt access token
    const accessToken = decryptToken(connection.access_token)

    // Send message via platform API (simplified for V1)
    // For V1, we'll simulate the send and store the message
    // In production, this would call the actual platform API
    let platformMessageId: string
    try {
      platformMessageId = await sendMessageToPlatform(
        connection.platform,
        accessToken,
        connection.platform_account_id,
        conv.platform_conversation_id,
        content,
        conv.conversationType
      )
    } catch (error: any) {
      console.error('[Send Message] Platform API error:', error)
      return NextResponse.json(
        { error: `Failed to send message: ${error.message}` },
        { status: 500 }
      )
    }

    // Save message to database
    const { data: message, error: msgError } = await supabaseAdmin
      .from('social_messages')
      .insert({
        conversation_id: params.id,
        platform_message_id: platformMessageId,
        platform: connection.platform,
        sender_id: connection.platform_account_id,
        sender_name: connection.platform_account_id, // Will be updated with actual name
        sender_type: 'user',
        content: content.trim(),
        media_urls: null,
        is_read: true
      })
      .select()
      .single()
    
    if (msgError) {
      throw new Error(`Failed to save message: ${msgError.message}`)
    }

    // Update conversation's last_message_at and unread_count
    await supabaseAdmin
      .from('social_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)

    return NextResponse.json({
      message: {
        id: message.id,
        conversationId: message.conversation_id,
        platformMessageId: message.platform_message_id,
        platform: message.platform,
        senderId: message.sender_id,
        senderName: message.sender_name,
        senderType: message.sender_type,
        content: message.content,
        mediaUrls: message.media_urls,
        isRead: message.is_read,
        createdAt: new Date(message.created_at)
      }
    })
  } catch (error: any) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to send message' },
      { status: 500 }
    )
  }
}

/**
 * Sends a message to the platform API
 * V1: Simplified implementation - in production, use actual platform clients
 */
async function sendMessageToPlatform(
  platform: string,
  accessToken: string,
  accountId: string,
  conversationId: string,
  content: string,
  conversationType: string
): Promise<string> {
  // For V1, we'll generate a mock message ID
  // In production, this would call the actual platform API:
  // - Facebook/Instagram: Graph API /messages endpoint
  // - LinkedIn: Messaging API
  // - Twitter: Direct Messages API
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Generate a mock platform message ID
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

