import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/libs/communication-hub/src/email_service'
import { sendSMS } from '@/libs/communication-hub/src/sms_service'

/**
 * POST /api/contacts/[id]/send-message
 * Sends a one-to-one email or SMS to a contact
 * Automatically logs the event to activity_events
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
    const { channel, subject, body: messageBody } = body

    if (!channel || !['email', 'sms'].includes(channel)) {
      return NextResponse.json(
        { error: 'Channel must be "email" or "sms"' },
        { status: 400 }
      )
    }

    if (!messageBody || !messageBody.trim()) {
      return NextResponse.json(
        { error: 'Message body is required' },
        { status: 400 }
      )
    }

    if (channel === 'email' && (!subject || !subject.trim())) {
      return NextResponse.json(
        { error: 'Email subject is required' },
        { status: 400 }
      )
    }

    // Fetch contact
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    if (contactError || !contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // Check unsubscribe status
    if (contact.is_unsubscribed) {
      return NextResponse.json(
        { error: 'Contact has unsubscribed' },
        { status: 400 }
      )
    }

    // Validate channel availability
    if (channel === 'email' && !contact.email) {
      return NextResponse.json(
        { error: 'Contact does not have an email address' },
        { status: 400 }
      )
    }

    if (channel === 'sms' && !contact.phone) {
      return NextResponse.json(
        { error: 'Contact does not have a phone number' },
        { status: 400 }
      )
    }

    // Send message
    let messageId: string
    let content: string

    if (channel === 'email') {
      messageId = await sendEmail(
        contact.email,
        subject,
        messageBody // HTML content
      )
      content = `Sent email: "${subject}"`
    } else {
      messageId = await sendSMS(contact.phone, messageBody)
      content = `Sent SMS: "${messageBody.substring(0, 50)}${messageBody.length > 50 ? '...' : ''}"`
    }

    // Log activity event
    const eventType = channel === 'email' ? 'email_sent' : 'sms_sent'
    
    await supabaseAdmin
      .from('activity_events')
      .insert({
        user_id: userId,
        contact_id: params.id,
        event_type: eventType,
        content: content
      })

    return NextResponse.json({ success: true, messageId })
  } catch (error: any) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to send message' },
      { status: 500 }
    )
  }
}

