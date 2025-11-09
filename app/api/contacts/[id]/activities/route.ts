import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { ActivityEvent } from '@/libs/contact-hub/src/types'

/**
 * GET /api/contacts/[id]/activities
 * Fetches all activity events for a contact
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify contact belongs to user
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    if (contactError || !contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // Fetch activities
    const { data: activities, error } = await supabaseAdmin
      .from('activity_events')
      .select('*')
      .eq('contact_id', params.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch activities: ${error.message}`)
    }

    const activityEvents: ActivityEvent[] = (activities || []).map(activity => ({
      id: activity.id,
      userId: activity.user_id,
      contactId: activity.contact_id,
      eventType: activity.event_type as ActivityEvent['eventType'],
      content: activity.content,
      createdAt: new Date(activity.created_at)
    }))

    return NextResponse.json({ activities: activityEvents })
  } catch (error: any) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/contacts/[id]/activities
 * Creates a new activity event (e.g., note)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { eventType, content } = body

    if (!eventType || !content || !content.trim()) {
      return NextResponse.json(
        { error: 'eventType and content are required' },
        { status: 400 }
      )
    }

    // Verify contact belongs to user
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    if (contactError || !contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // Create activity event
    const { data: activity, error } = await supabaseAdmin
      .from('activity_events')
      .insert({
        user_id: userId,
        contact_id: params.id,
        event_type: eventType,
        content: content.trim()
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create activity event: ${error.message}`)
    }

    const activityEvent: ActivityEvent = {
      id: activity.id,
      userId: activity.user_id,
      contactId: activity.contact_id,
      eventType: activity.event_type as ActivityEvent['eventType'],
      content: activity.content,
      createdAt: new Date(activity.created_at)
    }

    return NextResponse.json({ activity: activityEvent })
  } catch (error: any) {
    console.error('Error creating activity:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create activity' },
      { status: 500 }
    )
  }
}

