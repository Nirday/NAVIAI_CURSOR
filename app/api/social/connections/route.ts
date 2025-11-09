import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { SocialConnection } from '@/libs/social-hub/src/types'

/**
 * GET /api/social/connections
 * Fetches all social connections for the authenticated user
 */
export async function GET() {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('social_connections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Don't decrypt tokens in API responses - only decrypt when needed for API calls
    const connections: SocialConnection[] = (data || []).map((row: any) => {
      // Check if token is expired
      const isExpired = row.token_expires_at && new Date(row.token_expires_at) < new Date()
      
      return {
        id: row.id,
        userId: row.user_id,
        platform: row.platform,
        platformAccountId: row.platform_account_id,
        platformUsername: row.platform_username,
        accessToken: row.access_token, // Encrypted - don't decrypt in API responses
        refreshToken: row.refresh_token || null, // Encrypted
        tokenExpiresAt: row.token_expires_at ? new Date(row.token_expires_at) : null,
        isActive: row.is_active && !isExpired, // Mark inactive if expired
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }
    })

    return NextResponse.json({ connections })
  } catch (error: any) {
    console.error('Error fetching social connections:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch social connections' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/social/connections
 * Creates a new social connection (for OAuth flow - will be implemented in Task 5.5)
 */
export async function POST(req: NextRequest) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // This will be fully implemented in Task 5.5
  return NextResponse.json(
    { error: 'OAuth connection flow will be implemented in Task 5.5' },
    { status: 501 }
  )
}

