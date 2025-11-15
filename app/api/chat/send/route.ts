/**
 * API Route for Sending Chat Messages
 * Handles sending user messages and getting AI responses
 */

import { NextRequest, NextResponse } from 'next/server'
import { processUserMessage } from '@/libs/chat-core/src/orchestrator'

export async function POST(request: NextRequest) {
  try {
    const { userId, message } = await request.json()
    
    if (!userId || !message) {
      return NextResponse.json(
        { error: 'User ID and message are required' },
        { status: 400 }
      )
    }
    
    // Process the user message through the orchestrator
    const responseContent = await processUserMessage(userId, message)
    
    return NextResponse.json({
      success: true,
      response: {
        messageId: undefined,
        content: responseContent,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('Error processing chat message:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
