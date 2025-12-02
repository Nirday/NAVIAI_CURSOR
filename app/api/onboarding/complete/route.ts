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

    console.log('Onboarding complete request:', { userId, profileDataKeys: profileData ? Object.keys(profileData) : null })

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!profileData) {
      return NextResponse.json(
        { error: 'Profile data is required' },
        { status: 400 }
      )
    }

    if (!profileData.businessName || profileData.businessName.trim() === '') {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      )
    }

    if (!profileData.industry || profileData.industry.trim() === '') {
      return NextResponse.json(
        { error: 'Industry is required' },
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
    console.error('Error details:', { 
      message: error.message, 
      stack: error.stack,
      name: error.name 
    })
    
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

    // Return more detailed error message for debugging
    return NextResponse.json(
      { error: error.message || 'Failed to complete onboarding. Please try again.' },
      { status: 500 }
    )
  }
}

