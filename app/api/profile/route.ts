import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getProfile, updateProfile } from '@/libs/chat-core/src/profile'
import { PartialBusinessProfile } from '@/libs/chat-core/src/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/profile
 * Fetches business profile for the authenticated user
 */
export async function GET() {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
}

/**
 * PATCH /api/profile
 * Updates business profile with intelligent merging
 * This allows dashboard components to continuously enrich the profile
 */
export async function PATCH(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
}

