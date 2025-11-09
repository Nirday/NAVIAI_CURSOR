import { NextRequest, NextResponse } from 'next/server'
import { ingestNewLead } from '../../../../libs/contact-hub/src/lead_ingestion'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * API route for website contact form submissions
 * Determines user_id from the website domain
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, message, domain } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    // Find user_id from website domain
    const { data: websiteData, error: websiteError } = await supabaseAdmin
      .from('websites')
      .select('user_id')
      .eq('published_domain', domain)
      .eq('status', 'published')
      .single()

    if (websiteError || !websiteData) {
      return NextResponse.json(
        { error: 'Website not found or not published' },
        { status: 404 }
      )
    }

    const userId = websiteData.user_id

    // Ingest the lead
    await ingestNewLead(userId, 'Website Contact Form', {
      name,
      email,
      phone,
      message
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to submit lead:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to submit lead' },
      { status: 500 }
    )
  }
}

