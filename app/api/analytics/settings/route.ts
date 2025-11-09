import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

function getAuthenticatedUserId(): string | null {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  return userId && userId.length > 0 ? userId : null
}

export async function GET() {
  const userId = getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('analytics_settings')
      .select('plausible_shared_link, plausible_api_key')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch analytics settings: ${error.message}`)
    }

    // Don't return API key to frontend for security (only return shared link)
    return NextResponse.json({
      settings: {
        plausibleSharedLink: data?.plausible_shared_link || null,
        // API key is not returned to frontend for security
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load settings' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { plausibleSharedLink, plausibleApiKey } = body

    const { error } = await supabaseAdmin
      .from('analytics_settings')
      .upsert({
        user_id: userId,
        plausible_shared_link: plausibleSharedLink || null,
        plausible_api_key: plausibleApiKey || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      throw new Error(`Failed to save analytics settings: ${error.message}`)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to save settings' }, { status: 500 })
  }
}

