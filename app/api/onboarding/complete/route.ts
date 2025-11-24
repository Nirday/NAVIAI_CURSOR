import { NextRequest, NextResponse } from 'next/server'
import { createProfile } from '@/libs/chat-core/src/profile'

export const dynamic = 'force-dynamic'

/**
 * POST /api/onboarding/complete
 * Completes onboarding by creating a business profile
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, profileData } = await req.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!profileData || !profileData.businessName || !profileData.industry) {
      return NextResponse.json(
        { error: 'Business name and industry are required' },
        { status: 400 }
      )
    }

    // Create the business profile
    const profile = await createProfile(userId, profileData)

    return NextResponse.json({
      success: true,
      profile,
      message: 'Profile created successfully'
    })
  } catch (error: any) {
    console.error('Error completing onboarding:', error)
    
    // Handle specific errors
    if (error.message?.includes('already exists')) {
      return NextResponse.json(
        { error: 'Profile already exists for this user' },
        { status: 409 }
      )
    }

    if (error.message?.includes('required') || error.message?.includes('Validation')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to complete onboarding. Please try again.' },
      { status: 500 }
    )
  }
}

