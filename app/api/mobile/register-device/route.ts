import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * POST /api/mobile/register-device
 * Register device token for push notifications
 * V1.5: Mobile app push notification support
 */
export async function POST(req: NextRequest) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { deviceToken, platform } = body

    if (!deviceToken || typeof deviceToken !== 'string') {
      return NextResponse.json(
        { error: 'Device token is required' },
        { status: 400 }
      )
    }

    if (!platform || !['ios', 'android'].includes(platform)) {
      return NextResponse.json(
        { error: 'Platform must be ios or android' },
        { status: 400 }
      )
    }

    // Upsert device token
    const { error } = await supabaseAdmin
      .from('device_tokens')
      .upsert({
        user_id: userId,
        device_token: deviceToken,
        platform: platform,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,device_token'
      })

    if (error) {
      throw new Error(`Failed to register device: ${error.message}`)
    }

    return NextResponse.json({ success: true, message: 'Device registered successfully' })
  } catch (error: any) {
    console.error('Error registering device:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to register device' },
      { status: 500 }
    )
  }
}

