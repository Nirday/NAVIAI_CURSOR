import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { SeoSettings } from '@/libs/seo-audit/src/types'

/**
 * GET /api/seo/settings
 * Fetches SEO settings for the authenticated user
 */
export async function GET() {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('seo_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found, return defaults
        return NextResponse.json({
          settings: {
            userId,
            keywords: [],
            competitors: [],
            location: null,
            latestInsight: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        })
      }
      throw error
    }

    return NextResponse.json({
      settings: {
        userId: data.user_id,
        keywords: data.keywords || [],
        competitors: data.competitors || [],
        location: data.location || null,
        latestInsight: data.latest_insight,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    })
  } catch (error: any) {
    console.error('Error fetching SEO settings:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch SEO settings' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/seo/settings
 * Updates SEO settings for the authenticated user
 */
export async function POST(req: NextRequest) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const settings: SeoSettings = body.settings

    // Validate limits
    if (settings.keywords.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 keywords allowed' },
        { status: 400 }
      )
    }

    if (settings.competitors.length > 3) {
      return NextResponse.json(
        { error: 'Maximum 3 competitors allowed' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('seo_settings')
      .upsert({
        user_id: userId,
        keywords: settings.keywords,
        competitors: settings.competitors,
        location: settings.location || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating SEO settings:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update SEO settings' },
      { status: 500 }
    )
  }
}

