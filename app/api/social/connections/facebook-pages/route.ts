/**
 * API Route for Facebook Page Selection
 * POST /api/social/connections/facebook-pages
 * Saves Facebook Page connection after user selection
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { encryptToken } from '@/libs/connections-hub/src/encryption'
import { getInstagramAccount } from '@/libs/connections-hub/src/oauth'


export const dynamic = 'force-dynamic'
/**
 * POST /api/social/connections/facebook-pages
 * Saves selected Facebook Page as connection
 */
export async function POST(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { pageId, pageName, pageAccessToken } = body

    if (!pageId || !pageAccessToken) {
      return NextResponse.json(
        { error: 'Page ID and access token are required' },
        { status: 400 }
      )
    }

    // Encrypt page access token
    const encryptedAccessToken = encryptToken(pageAccessToken)

    // Save Facebook Page connection
    const { error: fbError } = await supabaseAdmin
      .from('social_connections')
      .upsert({
        user_id: userId,
        platform: 'facebook',
        platform_account_id: pageId,
        platform_username: pageName || 'Facebook Page',
        access_token: encryptedAccessToken,
        is_active: true
      }, {
        onConflict: 'user_id,platform,platform_account_id'
      })

    if (fbError) {
      throw fbError
    }

    // Check if Instagram Business Account is connected to this page
    const instagramAccount = await getInstagramAccount(pageId, pageAccessToken)
    
    if (instagramAccount) {
      // Save Instagram connection
      await supabaseAdmin
        .from('social_connections')
        .upsert({
          user_id: userId,
          platform: 'instagram',
          platform_account_id: instagramAccount.id,
          platform_username: instagramAccount.username,
          access_token: encryptedAccessToken, // Same page token
          is_active: true
        }, {
          onConflict: 'user_id,platform,platform_account_id'
        })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error saving Facebook page:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to save Facebook page connection' },
      { status: 500 }
    )
  }
}

