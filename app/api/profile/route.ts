import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getProfile } from '@/libs/chat-core/src/profile'


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

