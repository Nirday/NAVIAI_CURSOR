import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptToken } from '@/libs/connections-hub/src/encryption'


export const dynamic = 'force-dynamic'
/**
 * POST /api/social/conversations/[id]/reply
 * Sends a reply message to a social media conversation
 */
export async function POST(
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
    const { content, mediaUrls } = body

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
          platform_username,
          access_token
        )
      `)
      .eq('id', id)
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

    // Send message via platform API
    let platformMessageId: string
    try {
      platformMessageId = await sendReplyToPlatform(
        connection.platform,
        accessToken,
        connection.platform_account_id,
        conv.platform_conversation_id,
        conv.customer_id,
        content,
        conv.conversation_type,
        mediaUrls || null
      )
    } catch (error: any) {
      console.error('[Send Reply] Platform API error:', error)
      return NextResponse.json(
        { error: `Failed to send reply: ${error.message}` },
        { status: 500 }
      )
    }

    // Save message to database
    const { data: message, error: msgError } = await supabaseAdmin
      .from('social_messages')
      .insert({
        conversation_id: id,
        platform_message_id: platformMessageId,
        platform: connection.platform,
        sender_id: connection.platform_account_id,
        sender_name: connection.platform_username || 'You',
        sender_type: 'user',
        content: content.trim(),
        media_urls: mediaUrls || null,
        is_read: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (msgError) {
      throw new Error(`Failed to save message: ${msgError.message}`)
    }

    // Update conversation's last_message_at, unread_count, and status
    const now = new Date().toISOString()
    await supabaseAdmin
      .from('social_conversations')
      .update({
        last_message_at: now,
        updated_at: now,
        status: 'open', // Keep conversation open when we reply
        unread_count: 0 // Reset unread count since we just replied
      })
      .eq('id', id)

    return NextResponse.json({
      success: true,
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
    console.error('Error sending reply:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to send reply' },
      { status: 500 }
    )
  }
}

/**
 * Sends a reply message to the platform API
 * V1: Simplified implementation - in production, use actual platform clients
 * 
 * Platform-specific implementations:
 * - Facebook/Instagram: Graph API POST /{page-id}/messages
 * - LinkedIn: Messaging API POST /messaging/conversations/{conversation-id}/messages
 * - Twitter: Direct Messages API POST /2/dm_conversations/{dm_conversation_id}/messages
 */
async function sendReplyToPlatform(
  platform: string,
  accessToken: string,
  accountId: string,
  conversationId: string,
  customerId: string,
  content: string,
  conversationType: 'direct_message' | 'comment_thread',
  mediaUrls: string[] | null
): Promise<string> {
  // For V1, we'll generate a mock message ID
  // In production, this would call the actual platform API:
  
  if (platform === 'facebook' || platform === 'instagram') {
    // Facebook/Instagram Graph API
    // POST https://graph.facebook.com/v18.0/{page-id}/messages
    // Body: { recipient: { id: customerId }, message: { text: content } }
    // For comments: POST /{post-id}/comments with { message: content }
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100))
    return `msg_fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  if (platform === 'linkedin') {
    // LinkedIn Messaging API
    // POST /messaging/conversations/{conversation-id}/messages
    // Body: { body: { text: content } }
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100))
    return `msg_li_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  if (platform === 'twitter') {
    // Twitter Direct Messages API v2
    // POST /2/dm_conversations/{dm_conversation_id}/messages
    // Body: { text: content }
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100))
    return `msg_tw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  throw new Error(`Unsupported platform: ${platform}`)
}

