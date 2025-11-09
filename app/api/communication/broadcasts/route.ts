import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { Broadcast, BroadcastContentVersion, AbTestConfig } from '@/libs/communication-hub/src/types'
import { fetchContactsForEmailBroadcast, fetchContactsForSmsBroadcast } from '@/libs/communication-hub/src/contact_adapter'

/**
 * POST /api/communication/broadcasts
 * Creates a new broadcast
 */
export async function POST(req: NextRequest) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      channel,
      tags, // Array of tags for audience filtering
      contentVersions, // Array of { variant: 'A' | 'B', subject: string, body: string }
      abTestConfig, // AbTestConfig object or null
      scheduledAt, // ISO date string or null for immediate send
      skipAbTest // Boolean: if true, only use first content version
    } = body

    // Validate required fields
    if (!channel || !['email', 'sms'].includes(channel)) {
      return NextResponse.json(
        { error: 'Channel must be "email" or "sms"' },
        { status: 400 }
      )
    }

    if (!contentVersions || !Array.isArray(contentVersions) || contentVersions.length === 0) {
      return NextResponse.json(
        { error: 'At least one content version is required' },
        { status: 400 }
      )
    }

    // Fetch contacts for audience
    const contacts = channel === 'email'
      ? await fetchContactsForEmailBroadcast(userId, tags || [])
      : await fetchContactsForSmsBroadcast(userId, tags || [])

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: 'No contacts found matching the selected criteria' },
        { status: 400 }
      )
    }

    // Prepare content versions
    let finalContentVersions: BroadcastContentVersion[]
    let finalAbTestConfig: AbTestConfig | null = null

    if (skipAbTest || contentVersions.length === 1) {
      // Single version broadcast (no A/B test)
      const version = contentVersions[0]
      finalContentVersions = [{
        variant: 'A',
        subject: version.subject,
        body: version.body
      }]
    } else if (contentVersions.length === 2) {
      // A/B test broadcast
      finalContentVersions = contentVersions.map((v: any, index: number) => ({
        variant: index === 0 ? 'A' : 'B',
        subject: v.subject,
        body: v.body
      }))

      // Set default A/B test config if not provided
      if (abTestConfig) {
        finalAbTestConfig = abTestConfig
      } else {
        finalAbTestConfig = {
          testSizePercentage: 20,
          variantASize: 50,
          variantBSize: 50
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid content versions: must be 1 or 2' },
        { status: 400 }
      )
    }

    // Create temporary audience identifier (tags string)
    const audienceId = `tags:${(tags || []).join(',')}`

    // Determine status
    let status: 'draft' | 'scheduled' | 'testing' | 'sending' | 'sent' | 'failed'
    if (scheduledAt) {
      status = 'scheduled'
    } else if (finalAbTestConfig) {
      status = 'testing' // Will start A/B test immediately
    } else {
      status = 'scheduled' // Will send immediately
    }

    // Insert broadcast
    const { data: broadcast, error: insertError } = await supabaseAdmin
      .from('broadcasts')
      .insert({
        user_id: userId,
        audience_id: audienceId, // Temporary audience ID (tags string)
        channel,
        content: finalContentVersions,
        ab_test_config: finalAbTestConfig,
        status,
        scheduled_at: scheduledAt || null,
        total_recipients: contacts.length,
        sent_count: 0,
        failed_count: 0
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to create broadcast: ${insertError.message}`)
    }

    // Format response
    const formattedBroadcast: Broadcast = {
      id: broadcast.id,
      userId: broadcast.user_id,
      audienceId: broadcast.audience_id,
      channel: broadcast.channel,
      content: broadcast.content,
      abTestConfig: broadcast.ab_test_config,
      status: broadcast.status,
      scheduledAt: broadcast.scheduled_at ? new Date(broadcast.scheduled_at) : null,
      sentAt: broadcast.sent_at ? new Date(broadcast.sent_at) : null,
      totalRecipients: broadcast.total_recipients,
      sentCount: broadcast.sent_count,
      failedCount: broadcast.failed_count,
      openCount: broadcast.open_count,
      clickCount: broadcast.click_count,
      createdAt: new Date(broadcast.created_at),
      updatedAt: new Date(broadcast.updated_at)
    }

    return NextResponse.json({ broadcast: formattedBroadcast })
  } catch (error: any) {
    console.error('Error creating broadcast:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create broadcast' },
      { status: 500 }
    )
  }
}

