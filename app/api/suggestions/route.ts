/**
 * API Route for Suggestions
 * Handles fetching suggested prompts for users
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSuggestedPrompts } from '@/libs/chat-core/src/suggestion_engine'
import { getProfile } from '@/libs/chat-core/src/profile'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }
    
    // Get user's profile for context
    const profile = await getProfile(userId)
    
    // Get suggestions
    const suggestions = await getSuggestedPrompts(userId, profile)
    
    return NextResponse.json({
      success: true,
      suggestions
    })
    
  } catch (error) {
    console.error('Error fetching suggestions:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
