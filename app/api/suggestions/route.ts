/**
 * API Route for Suggestions
 * Handles fetching suggested prompts for users
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getSuggestedPrompts } from '@/libs/chat-core/src/suggestion_engine'
import { getProfile } from '@/libs/chat-core/src/profile'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Get session from cookies
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // No-op for read-only operations
          },
        },
      }
    )

    // Verify session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    
    // Get user's profile for context (handle gracefully if not found)
    let profile = null
    try {
      profile = await getProfile(userId)
    } catch (profileError) {
      // Log but don't fail - suggestions can work without profile
      console.warn('Could not fetch profile for suggestions:', profileError)
    }
    
    // Get suggestions (works with or without profile)
    const suggestions = await getSuggestedPrompts(userId, profile || undefined)
    
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
