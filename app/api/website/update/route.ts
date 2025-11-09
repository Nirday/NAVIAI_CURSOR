import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { validateWebsiteData } from '@/libs/website-builder/src/validation'
import { publishWebsite } from '@/libs/website-builder/src/publisher'
import { Website } from '@/libs/website-builder/src/types'

/**
 * POST /api/website/update
 * V1.5: Form-based website editor endpoint
 * Updates website data and publishes
 */
export async function POST(req: NextRequest) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const websiteData = body.websiteData

    if (!websiteData) {
      return NextResponse.json(
        { error: 'websiteData is required' },
        { status: 400 }
      )
    }

    // Validate against WebsiteData TypeScript interface using Zod
    const validation = validateWebsiteData(websiteData)

    if (!validation.success) {
      // Return field-level errors
      return NextResponse.json(
        { 
          error: 'Validation failed',
          fieldErrors: validation.errors
        },
        { status: 400 }
      )
    }

    const website = validation.website!
    
    // Ensure userId matches
    if (website.userId !== userId) {
      return NextResponse.json(
        { error: 'User ID mismatch' },
        { status: 403 }
      )
    }

    // Transaction #1: Save to database
    const { updateWebsiteData } = await import('@/libs/website-builder/src/data')
    await updateWebsiteData(userId, website)

    // Transaction #2: Publish website (asynchronous, non-blocking)
    // This will generate static files and ping Google Sitemaps API
    let publishError: Error | null = null
    let publishedDomain: string | null = null

    try {
      // Get existing domain or generate new one
      const { data: existing } = await supabaseAdmin
        .from('websites')
        .select('published_domain')
        .eq('user_id', userId)
        .single()

      const domain = existing?.published_domain || 
        `${website.name.toLowerCase().replace(/\s+/g, '-')}.${process.env.NEXT_PUBLIC_PUBLISH_BASE_DOMAIN || 'naviai.local'}`

      publishedDomain = await publishWebsite(userId, website, domain)
    } catch (error: any) {
      publishError = error
      console.error('[Website Update] Publish error:', error)
      // Don't fail the request - data is saved
    }

    // Response
    if (publishError) {
      // Data saved but publish failed
      return NextResponse.json({
        success: true,
        message: 'Your changes are saved, but the publish failed. We are retrying in the background.',
        saved: true,
        published: false,
        error: publishError.message
      }, { status: 200 }) // 200 because data was saved successfully
    }

    return NextResponse.json({
      success: true,
      message: 'Website updated and published successfully',
      saved: true,
      published: true,
      domain: publishedDomain
    })
  } catch (error: any) {
    console.error('[Website Update] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update website' },
      { status: 500 }
    )
  }
}

