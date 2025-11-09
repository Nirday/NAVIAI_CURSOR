/**
 * API Route for Chat Messages
 * Handles fetching chat message history
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchChatHistory } from '@/libs/chat-core/src/orchestrator'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }
    
    // Fetch chat history
    const messages = await fetchChatHistory(userId)
    
    return NextResponse.json({
      success: true,
      messages
    })
    
  } catch (error) {
    console.error('Error fetching chat messages:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch chat messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
