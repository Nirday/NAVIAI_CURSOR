import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getProfile, updateProfile } from '@/libs/chat-core/src/profile'
import { PartialBusinessProfile } from '@/libs/chat-core/src/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/profile
 * Fetches business profile for the authenticated user
 */
export async function GET() {
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

    try {
      const profile = await getProfile(userId)
      
      if (!profile) {
        return NextResponse.json(
          { error: 'Profile not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ profile })
    } catch (error: any) {
      console.error('Error fetching profile:', error)
      return NextResponse.json(
        { error: error?.message || 'Failed to fetch profile' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in /api/profile GET:', error)
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

/**
 * PATCH /api/profile
 * Updates business profile with intelligent merging
 * This allows dashboard components to continuously enrich the profile
 */
export async function PATCH(req: NextRequest) {
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

    try {
      const updates: PartialBusinessProfile = await req.json()
      
      if (!updates || typeof updates !== 'object') {
        return NextResponse.json(
          { error: 'Invalid request: updates object is required' },
          { status: 400 }
        )
      }

      // Update profile with intelligent merging
      const updatedProfile = await updateProfile(userId, updates)

      return NextResponse.json({
        success: true,
        profile: updatedProfile,
        message: 'Profile updated successfully'
      })
    } catch (error: any) {
      console.error('Error updating profile:', error)
      
      // Handle specific error types
      if (error.name === 'ValidationError') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
      
      if (error.name === 'DatabaseError') {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { error: error?.message || 'Failed to update profile' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in /api/profile PATCH:', error)
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

