import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { getReplySuggestion } from '@/libs/social-hub/src/reply_assistant'
import { SocialConversation, SocialMessage } from '@/libs/social-hub/src/types'
import { BusinessProfile } from '@/libs/chat-core/src/types'


export const dynamic = 'force-dynamic'
/**
 * POST /api/social/conversations/[id]/suggest-reply
 * Generates an AI reply suggestion for a conversation
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
    // Fetch conversation
    const { data: conv, error: convError } = await supabaseAdmin
      .from('social_conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    
    if (convError || !conv) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Fetch messages
    const { data: messages, error: msgError } = await supabaseAdmin
      .from('social_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
    
    if (msgError) {
      throw new Error(`Failed to fetch messages: ${msgError.message}`)
    }

    const formattedMessages: SocialMessage[] = (messages || []).map((msg: any) => ({
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

    const formattedConv: SocialConversation = {
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

    // Fetch business profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (profileError || !profile) {
      throw new Error('Business profile not found')
    }

    const businessProfile: BusinessProfile = {
      userId: profile.user_id,
      businessName: profile.business_name,
      industry: profile.industry,
      location: profile.location,
      contactInfo: profile.contact_info,
      services: profile.services,
      hours: profile.hours || [],
      targetAudience: profile.target_audience,
      brandVoice: profile.brand_voice,
      customAttributes: profile.custom_attributes || [],
      createdAt: new Date(profile.created_at),
      updatedAt: new Date(profile.updated_at)
    }

    // Generate reply suggestion
    const suggestion = await getReplySuggestion(formattedConv, formattedMessages, businessProfile)

    return NextResponse.json({ suggestion })
  } catch (error: any) {
    console.error('Error generating reply suggestion:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to generate reply suggestion' },
      { status: 500 }
    )
  }
}

