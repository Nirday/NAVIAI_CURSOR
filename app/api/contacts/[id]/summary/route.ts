import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { Contact, ActivityEvent } from '@/libs/contact-hub/src/types'
import { generateActivitySummary } from '@/libs/contact-hub/src/ai_summary'


export const dynamic = 'force-dynamic'
/**
 * POST /api/contacts/[id]/summary
 * Generates an AI summary of the contact's activity history
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify contact belongs to user
    const { data: contactData, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (contactError || !contactData) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    const contact: Contact = {
      id: contactData.id,
      userId: contactData.user_id,
      name: contactData.name,
      email: contactData.email,
      phone: contactData.phone,
      tags: contactData.tags || [],
      isUnsubscribed: contactData.is_unsubscribed || false,
      createdAt: new Date(contactData.created_at),
      updatedAt: new Date(contactData.updated_at)
    }

    // Fetch last 20 activity events
    const { data: activities, error: activitiesError } = await supabaseAdmin
      .from('activity_events')
      .select('*')
      .eq('contact_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (activitiesError) {
      throw new Error(`Failed to fetch activities: ${activitiesError.message}`)
    }

    const activityEvents: ActivityEvent[] = (activities || []).map((activity: any) => ({
      id: activity.id,
      userId: activity.user_id,
      contactId: activity.contact_id,
      eventType: activity.event_type as ActivityEvent['eventType'],
      content: activity.content,
      createdAt: new Date(activity.created_at)
    }))

    // Generate AI summary
    const summary = await generateActivitySummary(contact, activityEvents)

    return NextResponse.json({ summary })
  } catch (error: any) {
    console.error('Error generating summary:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to generate summary' },
      { status: 500 }
    )
  }
}

