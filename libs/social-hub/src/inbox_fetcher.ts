/**
 * Inbound Message Engine
 * Fetches messages from social media platforms via webhooks and polling
 */

import { supabaseAdmin } from '@/lib/supabase'
import { decryptToken } from '@/libs/connections-hub/src/encryption'
import { SocialConnection, SocialMessage, SocialConversation, SocialPlatform } from './types'

/**
 * Processes inbound webhook from Facebook/Instagram
 */
export async function processInboundWebhook(
  platform: 'facebook' | 'instagram',
  payload: any,
  userId?: string
): Promise<void> {
  try {
    // Process webhook entries
    const entries = payload.entry || []
    
    for (const entry of entries) {
      // Handle messages (DMs)
      if (entry.messaging) {
        for (const messaging of entry.messaging) {
          await processDirectMessage(platform, messaging, userId)
        }
      }

      // Handle comments (for posts)
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === 'comments' || change.field === 'mention') {
            await processComment(platform, change, userId)
          }
        }
      }
    }
  } catch (error: any) {
    console.error(`[Inbound Webhook] Error processing ${platform} webhook:`, error)
    throw error
  }
}

/**
 * Processes a direct message from webhook
 */
async function processDirectMessage(
  platform: 'facebook' | 'instagram',
  messaging: any,
  userId?: string
): Promise<void> {
  try {
    // Get sender info
    const senderId = messaging.sender?.id
    const recipientId = messaging.recipient?.id
    
    if (!senderId || !recipientId) {
      return
    }

    // Find connection by recipient ID (our page ID)
    const connection = await findConnectionByPlatformId(platform, recipientId)
    if (!connection) {
      console.warn(`[Inbound] No connection found for ${platform} page ${recipientId}`)
      return
    }

    const messageId = messaging.message?.mid || messaging.message_id
    const messageText = messaging.message?.text || ''
    const timestamp = messaging.timestamp ? new Date(messaging.timestamp * 1000) : new Date()

    // Check if message already exists (deduplication)
    const existing = await checkMessageExists(messageId, connection.id)
    if (existing) {
      return // Skip duplicate
    }

    // Determine if message is from us or customer
    const senderType = senderId === recipientId ? 'user' : 'customer'
    
    // Get or create conversation
    const conversation = await getOrCreateConversation({
      userId: connection.userId,
      connectionId: connection.id,
      platform,
      conversationType: 'direct_message',
      platformConversationId: senderId,
      customerId: senderId,
      customerName: messaging.sender?.name || `User ${senderId}`
    })

    // Create message
    await createMessage({
      conversationId: conversation.id,
      platformMessageId: messageId,
      platform,
      senderId,
      senderName: messaging.sender?.name || `User ${senderId}`,
      senderType,
      content: messageText,
      mediaUrls: messaging.message?.attachments?.map((a: any) => a.payload?.url).filter(Boolean) || null,
      createdAt: timestamp
    })

    // Update conversation unread count
    if (senderType === 'customer') {
      await updateConversationUnread(conversation.id, 1)
    }
  } catch (error: any) {
    console.error('[Inbound] Error processing direct message:', error)
    throw error
  }
}

/**
 * Processes a comment from webhook
 */
async function processComment(
  platform: 'facebook' | 'instagram',
  change: any,
  userId?: string
): Promise<void> {
  try {
    const comment = change.value
    const postId = comment.post_id || change.value?.post?.id
    const commentId = comment.id || comment.comment_id
    
    if (!postId || !commentId) {
      return
    }

    // Find connection
    const connection = await findConnectionByPlatformId(platform, comment.from?.id || comment.from_id)
    if (!connection) {
      // Try to find by any active connection for this platform
      const { data: connections } = await supabaseAdmin
        .from('social_connections')
        .select('*')
        .eq('platform', platform)
        .eq('is_active', true)
        .limit(1)
      
      if (!connections || connections.length === 0) {
        console.warn(`[Inbound] No connection found for ${platform}`)
        return
      }
      
      // Use first connection found
      const conn = connections[0]
      await processCommentWithConnection(platform, comment, postId, commentId, {
        id: conn.id,
        userId: conn.user_id,
        platform: conn.platform
      })
      return
    }

    await processCommentWithConnection(platform, comment, postId, commentId, connection)
  } catch (error: any) {
    console.error('[Inbound] Error processing comment:', error)
    throw error
  }
}

async function processCommentWithConnection(
  platform: 'facebook' | 'instagram',
  comment: any,
  postId: string,
  commentId: string,
  connection: { id: string; userId: string; platform: string }
): Promise<void> {
  // Check if message already exists
  const existing = await checkMessageExists(commentId, connection.id)
  if (existing) {
    return
  }

  const commentText = comment.message || comment.text || ''
  const timestamp = comment.created_time 
    ? new Date(comment.created_time) 
    : comment.timestamp 
      ? new Date(comment.timestamp * 1000)
      : new Date()

  // Get or create comment thread conversation
  const conversation = await getOrCreateConversation({
    userId: connection.userId,
    connectionId: connection.id,
    platform: platform as SocialPlatform,
    conversationType: 'comment_thread',
    platformConversationId: postId,
    customerId: postId,
    customerName: `Post ${postId}`
  })

  // Determine sender type
  const senderId = comment.from?.id || comment.from_id
  const senderType = 'customer' // Comments are always from customers

  // Create message
  await createMessage({
    conversationId: conversation.id,
    platformMessageId: commentId,
    platform: platform as SocialPlatform,
    senderId: senderId || 'unknown',
    senderName: comment.from?.name || comment.from_name || 'Anonymous',
    senderType,
    content: commentText,
    mediaUrls: comment.attachment?.media?.image?.src ? [comment.attachment.media.image.src] : null,
    createdAt: timestamp
  })

  // Update conversation unread count
  await updateConversationUnread(conversation.id, 1)
}

/**
 * Runs inbox poller to fetch messages from all platforms
 * Runs every 5 minutes for all users with active connections
 */
export async function runInboxPoller(): Promise<void> {
  const jobStartTime = new Date()
  console.log(`[Inbox Poller] Starting inbox polling at ${jobStartTime.toISOString()}`)
  
  try {
    // Get all active connections
    const { data: connections, error } = await supabaseAdmin
      .from('social_connections')
      .select('*')
      .eq('is_active', true)
    
    if (error) {
      throw new Error(`Failed to fetch connections: ${error.message}`)
    }
    
    if (!connections || connections.length === 0) {
      console.log('[Inbox Poller] No active connections found')
      return
    }
    
    console.log(`[Inbox Poller] Found ${connections.length} active connection(s)`)
    
    let successCount = 0
    let errorCount = 0
    
    // Process each connection
    for (const conn of connections) {
      try {
        await pollConnectionMessages(conn)
        successCount++
      } catch (error: any) {
        console.error(`[Inbox Poller] Error processing connection ${conn.id}:`, error)
        errorCount++
        // Continue with next connection
      }
    }
    
    console.log(`[Inbox Poller] Processed ${successCount} connections successfully, ${errorCount} errors`)
  } catch (error: any) {
    console.error('[Inbox Poller] Fatal error:', error)
    throw error
  }
}

/**
 * Polls messages for a specific connection
 */
async function pollConnectionMessages(connection: any): Promise<void> {
  const platform = connection.platform as SocialPlatform
  const decryptedToken = decryptToken(connection.access_token)
  
  switch (platform) {
    case 'facebook':
      await pollFacebookMessages(connection, decryptedToken)
      break
    case 'instagram':
      await pollInstagramMessages(connection, decryptedToken)
      break
    case 'linkedin':
      await pollLinkedInMessages(connection, decryptedToken)
      break
    case 'twitter':
      await pollTwitterMessages(connection, decryptedToken)
      break
    default:
      console.warn(`[Inbox Poller] Unsupported platform: ${platform}`)
  }
}

/**
 * Polls Facebook messages (DMs and comments)
 */
async function pollFacebookMessages(connection: any, accessToken: string): Promise<void> {
  try {
    // Poll DMs (conversations)
    const conversationsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${connection.platform_account_id}/conversations?access_token=${accessToken}&fields=id,participants,updated_time`,
      { headers: { 'Accept': 'application/json' } }
    )
    
    if (conversationsResponse.ok) {
      const conversationsData = await conversationsResponse.json()
      const conversations = conversationsData.data || []
      
      for (const conv of conversations) {
        // Get messages for this conversation
        const messagesResponse = await fetch(
          `https://graph.facebook.com/v18.0/${conv.id}/messages?access_token=${accessToken}&fields=id,from,message,created_time,attachments`,
          { headers: { 'Accept': 'application/json' } }
        )
        
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json()
          const messages = messagesData.data || []
          
          // Process each message
          for (const msg of messages) {
            await processDirectMessageFromPoll('facebook', msg, conv, connection, accessToken)
          }
        }
      }
    }
    
    // Poll comments on posts (simplified - get recent posts and their comments)
    // For V1, we'll poll comments on the page's recent posts
    const postsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${connection.platform_account_id}/posts?access_token=${accessToken}&limit=10&fields=id,comments{id,from,message,created_time}`,
      { headers: { 'Accept': 'application/json' } }
    )
    
    if (postsResponse.ok) {
      const postsData = await postsResponse.json()
      const posts = postsData.data || []
      
      for (const post of posts) {
        const comments = post.comments?.data || []
        for (const comment of comments) {
          await processCommentFromPoll('facebook', comment, post.id, connection)
        }
      }
    }
  } catch (error: any) {
    console.error('[Inbox Poller] Error polling Facebook:', error)
    throw error
  }
}

/**
 * Polls Instagram messages (DMs and comments)
 */
async function pollInstagramMessages(connection: any, accessToken: string): Promise<void> {
  try {
    // Instagram uses similar API structure to Facebook
    // Poll DMs
    const conversationsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${connection.platform_account_id}/conversations?access_token=${accessToken}&fields=id,participants,updated_time`,
      { headers: { 'Accept': 'application/json' } }
    )
    
    if (conversationsResponse.ok) {
      const conversationsData = await conversationsResponse.json()
      const conversations = conversationsData.data || []
      
      for (const conv of conversations) {
        const messagesResponse = await fetch(
          `https://graph.facebook.com/v18.0/${conv.id}/messages?access_token=${accessToken}&fields=id,from,message,created_time`,
          { headers: { 'Accept': 'application/json' } }
        )
        
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json()
          const messages = messagesData.data || []
          
          for (const msg of messages) {
            await processDirectMessageFromPoll('instagram', msg, conv, connection, accessToken)
          }
        }
      }
    }
    
    // Poll comments on recent media
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${connection.platform_account_id}/media?access_token=${accessToken}&limit=10&fields=id,comments{id,username,text,timestamp}`,
      { headers: { 'Accept': 'application/json' } }
    )
    
    if (mediaResponse.ok) {
      const mediaData = await mediaResponse.json()
      const mediaItems = mediaData.data || []
      
      for (const item of mediaItems) {
        const comments = item.comments?.data || []
        for (const comment of comments) {
          await processCommentFromPoll('instagram', comment, item.id, connection)
        }
      }
    }
  } catch (error: any) {
    console.error('[Inbox Poller] Error polling Instagram:', error)
    throw error
  }
}

/**
 * Polls LinkedIn messages
 */
async function pollLinkedInMessages(connection: any, accessToken: string): Promise<void> {
  try {
    // LinkedIn conversations API
    const conversationsResponse = await fetch(
      'https://api.linkedin.com/v2/messaging/conversations',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    )
    
    if (!conversationsResponse.ok) {
      console.warn('[Inbox Poller] LinkedIn conversations API failed:', await conversationsResponse.text())
      return
    }
    
    const conversationsData = await conversationsResponse.json()
    const conversations = conversationsData.elements || []
    
    for (const conv of conversations) {
      const conversationId = conv.entityUrn?.split(':').pop() || conv.id
      
      // Get messages for conversation
      const messagesResponse = await fetch(
        `https://api.linkedin.com/v2/messaging/conversations/${conversationId}/events`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      )
      
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json()
        const messages = messagesData.elements || []
        
        for (const msg of messages) {
          await processLinkedInMessage(msg, conversationId, connection)
        }
      }
    }
  } catch (error: any) {
    console.error('[Inbox Poller] Error polling LinkedIn:', error)
    throw error
  }
}

/**
 * Polls Twitter/X messages (DMs)
 */
async function pollTwitterMessages(connection: any, accessToken: string): Promise<void> {
  try {
    // Twitter DMs API
    const dmsResponse = await fetch(
      'https://api.twitter.com/2/dm/conversations',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    )
    
    if (!dmsResponse.ok) {
      console.warn('[Inbox Poller] Twitter DMs API failed:', await dmsResponse.text())
      return
    }
    
    const dmsData = await dmsResponse.json()
    const conversations = dmsData.data || []
    
    for (const conv of conversations) {
      const conversationId = conv.id
      
      // Get messages for conversation
      const messagesResponse = await fetch(
        `https://api.twitter.com/2/dm/conversations/${conversationId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      )
      
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json()
        const messages = messagesData.data || []
        
        for (const msg of messages) {
          await processTwitterMessage(msg, conversationId, connection)
        }
      }
    }
  } catch (error: any) {
    console.error('[Inbox Poller] Error polling Twitter:', error)
    throw error
  }
}

/**
 * Helper functions for processing messages from polling
 */
async function processDirectMessageFromPoll(
  platform: 'facebook' | 'instagram',
  msg: any,
  conv: any,
  connection: any,
  accessToken: string
): Promise<void> {
  const messageId = msg.id
  const existing = await checkMessageExists(messageId, connection.id)
  if (existing) return

  const senderId = msg.from?.id || msg.from_id
  const senderType = senderId === connection.platform_account_id ? 'user' : 'customer'
  const timestamp = msg.created_time ? new Date(msg.created_time) : new Date()

  const conversation = await getOrCreateConversation({
    userId: connection.user_id,
    connectionId: connection.id,
    platform: platform as SocialPlatform,
    conversationType: 'direct_message',
    platformConversationId: senderId,
    customerId: senderId,
    customerName: msg.from?.name || `User ${senderId}`
  })

  await createMessage({
    conversationId: conversation.id,
    platformMessageId: messageId,
    platform: platform as SocialPlatform,
    senderId,
    senderName: msg.from?.name || `User ${senderId}`,
    senderType,
    content: msg.message || '',
    mediaUrls: msg.attachments?.map((a: any) => a.image_data?.url || a.file_url).filter(Boolean) || null,
    createdAt: timestamp
  })

  if (senderType === 'customer') {
    await updateConversationUnread(conversation.id, 1)
  }
}

async function processCommentFromPoll(
  platform: 'facebook' | 'instagram',
  comment: any,
  postId: string,
  connection: any
): Promise<void> {
  const commentId = comment.id || comment.comment_id
  const existing = await checkMessageExists(commentId, connection.id)
  if (existing) return

  const timestamp = comment.created_time 
    ? new Date(comment.created_time)
    : comment.timestamp 
      ? new Date(comment.timestamp * 1000)
      : new Date()

  const conversation = await getOrCreateConversation({
    userId: connection.user_id,
    connectionId: connection.id,
    platform: platform as SocialPlatform,
    conversationType: 'comment_thread',
    platformConversationId: postId,
    customerId: postId,
    customerName: `Post ${postId}`
  })

  await createMessage({
    conversationId: conversation.id,
    platformMessageId: commentId,
    platform: platform as SocialPlatform,
    senderId: comment.from?.id || comment.from_id || comment.username || 'unknown',
    senderName: comment.from?.name || comment.username || 'Anonymous',
    senderType: 'customer',
    content: comment.message || comment.text || '',
    mediaUrls: null,
    createdAt: timestamp
  })

  await updateConversationUnread(conversation.id, 1)
}

async function processLinkedInMessage(msg: any, conversationId: string, connection: any): Promise<void> {
  const messageId = msg.entityUrn?.split(':').pop() || msg.id
  const existing = await checkMessageExists(messageId, connection.id)
  if (existing) return

  const senderId = msg.from?.entityUrn?.split(':').pop() || msg.from?.id
  const senderType = senderId === connection.platform_account_id ? 'user' : 'customer'
  const timestamp = msg.created?.time ? new Date(msg.created.time) : new Date()

  const conversation = await getOrCreateConversation({
    userId: connection.user_id,
    connectionId: connection.id,
    platform: 'linkedin',
    conversationType: 'direct_message',
    platformConversationId: conversationId,
    customerId: senderId || conversationId,
    customerName: msg.from?.name || `User ${senderId}`
  })

  await createMessage({
    conversationId: conversation.id,
    platformMessageId: messageId,
    platform: 'linkedin',
    senderId: senderId || 'unknown',
    senderName: msg.from?.name || 'Unknown',
    senderType,
    content: msg.body?.text || '',
    mediaUrls: null,
    createdAt: timestamp
  })

  if (senderType === 'customer') {
    await updateConversationUnread(conversation.id, 1)
  }
}

async function processTwitterMessage(msg: any, conversationId: string, connection: any): Promise<void> {
  const messageId = msg.id
  const existing = await checkMessageExists(messageId, connection.id)
  if (existing) return

  const senderId = msg.sender_id
  const senderType = senderId === connection.platform_account_id ? 'user' : 'customer'
  const timestamp = msg.created_at ? new Date(msg.created_at) : new Date()

  const conversation = await getOrCreateConversation({
    userId: connection.user_id,
    connectionId: connection.id,
    platform: 'twitter',
    conversationType: 'direct_message',
    platformConversationId: conversationId,
    customerId: senderId || conversationId,
    customerName: msg.sender_id || `User ${senderId}`
  })

  await createMessage({
    conversationId: conversation.id,
    platformMessageId: messageId,
    platform: 'twitter',
    senderId: senderId || 'unknown',
    senderName: msg.sender_id || 'Unknown',
    senderType,
    content: msg.text || '',
    mediaUrls: null,
    createdAt: timestamp
  })

  if (senderType === 'customer') {
    await updateConversationUnread(conversation.id, 1)
  }
}

/**
 * Database helper functions
 */
async function findConnectionByPlatformId(platform: string, platformId: string): Promise<SocialConnection | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('social_connections')
      .select('*')
      .eq('platform', platform)
      .eq('platform_account_id', platformId)
      .eq('is_active', true)
      .limit(1)
      .single()
    
    if (error || !data) return null
    
    return {
      id: data.id,
      userId: data.user_id,
      platform: data.platform,
      platformAccountId: data.platform_account_id,
      platformUsername: data.platform_username,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: data.token_expires_at ? new Date(data.token_expires_at) : null,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  } catch {
    return null
  }
}

async function checkMessageExists(platformMessageId: string, connectionId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('social_messages')
      .select('id')
      .eq('platform_message_id', platformMessageId)
      .limit(1)
    
    // If error or no data, message doesn't exist
    if (error || !data || data.length === 0) {
      return false
    }
    
    // If we got data, message exists
    return true
  } catch {
    return false
  }
}

async function getOrCreateConversation(params: {
  userId: string
  connectionId: string
  platform: SocialPlatform
  conversationType: 'direct_message' | 'comment_thread'
  platformConversationId: string
  customerId: string
  customerName: string
}): Promise<SocialConversation> {
  // Try to find existing conversation
  const { data: existing, error: findError } = await supabaseAdmin
    .from('social_conversations')
    .select('*')
    .eq('connection_id', params.connectionId)
    .eq('platform_conversation_id', params.platformConversationId)
    .eq('conversation_type', params.conversationType)
    .single()
  
  if (!findError && existing) {
    // Return existing conversation
    return {
      id: existing.id,
      userId: existing.user_id,
      connectionId: existing.connection_id,
      platform: existing.platform,
      conversationType: existing.conversation_type,
      platformConversationId: existing.platform_conversation_id,
      customerId: existing.customer_id,
      customerName: existing.customer_name,
      status: existing.status,
      lastMessageAt: new Date(existing.last_message_at),
      unreadCount: existing.unread_count,
      messages: [], // Will be fetched separately if needed
      createdAt: new Date(existing.created_at),
      updatedAt: new Date(existing.updated_at)
    }
  }
  
  // Create new conversation
  const { data: newConv, error: createError } = await supabaseAdmin
    .from('social_conversations')
    .insert({
      user_id: params.userId,
      connection_id: params.connectionId,
      platform: params.platform,
      conversation_type: params.conversationType,
      platform_conversation_id: params.platformConversationId,
      customer_id: params.customerId,
      customer_name: params.customerName,
      status: 'open',
      last_message_at: new Date(),
      unread_count: 0
    })
    .select()
    .single()
  
  if (createError) {
    throw new Error(`Failed to create conversation: ${createError.message}`)
  }
  
  return {
    id: newConv.id,
    userId: newConv.user_id,
    connectionId: newConv.connection_id,
    platform: newConv.platform,
    conversationType: newConv.conversation_type,
    platformConversationId: newConv.platform_conversation_id,
    customerId: newConv.customer_id,
    customerName: newConv.customer_name,
    status: newConv.status,
    lastMessageAt: new Date(newConv.last_message_at),
    unreadCount: newConv.unread_count,
    messages: [],
    createdAt: new Date(newConv.created_at),
    updatedAt: new Date(newConv.updated_at)
  }
}

async function createMessage(params: {
  conversationId: string
  platformMessageId: string
  platform: SocialPlatform
  senderId: string
  senderName: string
  senderType: 'user' | 'customer'
  content: string
  mediaUrls?: string[] | null
  createdAt: Date
}): Promise<void> {
  const { error } = await supabaseAdmin
    .from('social_messages')
    .insert({
      conversation_id: params.conversationId,
      platform_message_id: params.platformMessageId,
      platform: params.platform,
      sender_id: params.senderId,
      sender_name: params.senderName,
      sender_type: params.senderType,
      content: params.content,
      media_urls: params.mediaUrls || null,
      is_read: params.senderType === 'user', // User's own messages are read
      created_at: params.createdAt.toISOString()
    })
  
  if (error) {
    // If error is duplicate key, that's okay (idempotency)
    if (error.code === '23505') {
      return
    }
    throw new Error(`Failed to create message: ${error.message}`)
  }
  
  // Update conversation's last_message_at
  await supabaseAdmin
    .from('social_conversations')
    .update({
      last_message_at: params.createdAt.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', params.conversationId)
}

async function updateConversationUnread(conversationId: string, increment: number): Promise<void> {
  await supabaseAdmin.rpc('increment_unread_count', {
    conv_id: conversationId,
    increment_val: increment
  }).catch(async () => {
    // Fallback if RPC doesn't exist - use update
    const { data } = await supabaseAdmin
      .from('social_conversations')
      .select('unread_count')
      .eq('id', conversationId)
      .single()
    
    if (data) {
      await supabaseAdmin
        .from('social_conversations')
        .update({ unread_count: (data.unread_count || 0) + increment })
        .eq('id', conversationId)
    }
  })
}

