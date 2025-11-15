import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { validateWebhookSignature, formatPhoneNumber } from '@/libs/call-tracking/src/twilio_service'
import { getUserIdFromPhoneNumber } from '@/libs/call-tracking/src/data'

/**
 * POST /api/call-tracking/webhook
 * Twilio webhook handler for call events
 * Handles: call-initiated, call-completed, call-status
 */
export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature validation
    const body = await req.text()
    const formData = new URLSearchParams(body)
    
    // Extract Twilio parameters
    const callSid = formData.get('CallSid')
    const from = formData.get('From')
    const to = formData.get('To')
    const callStatus = formData.get('CallStatus')
    const callDuration = formData.get('CallDuration')
    const direction = formData.get('Direction')
    const signature = req.headers.get('x-twilio-signature')

    if (!callSid || !from || !to) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Validate webhook signature (in production)
    if (signature && process.env.NODE_ENV === 'production') {
      const url = req.url
      const params: Record<string, string> = {}
      formData.forEach((value, key) => {
        params[key] = value
      })
      
      const isValid = validateWebhookSignature(url, params, signature)
      if (!isValid) {
        console.error('[Call Webhook] Invalid signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 403 }
        )
      }
    }

    // Get user ID from tracked phone number
    const userId = await getUserIdFromPhoneNumber(to)
    if (!userId) {
      console.warn(`[Call Webhook] No user found for tracked number: ${to}`)
      // Still respond to Twilio to avoid retries
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Handle different call statuses
    if (callStatus === 'initiated' || callStatus === 'ringing') {
      // Call just started - we'll log it when completed
      // For now, just acknowledge
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    if (callStatus === 'completed' || callStatus === 'busy' || callStatus === 'no-answer' || callStatus === 'failed') {
      // Call completed - log the event
      await logCallEvent(userId, {
        callSid,
        from,
        to,
        status: mapCallStatus(callStatus),
        duration: callDuration ? parseInt(callDuration) : undefined,
        direction: direction === 'inbound' ? 'inbound' : 'outbound'
      })
    }

    // Respond to Twilio
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  } catch (error: any) {
    console.error('[Call Webhook] Error processing webhook:', error)
    // Still respond to Twilio to avoid retries
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }
}

/**
 * Log a call event to activity_events and create/update contact
 */
async function logCallEvent(
  userId: string,
  callData: {
    callSid: string
    from: string
    to: string
    status: 'answered' | 'voicemail' | 'missed'
    duration?: number
    direction: 'inbound' | 'outbound'
  }
): Promise<void> {
  try {
    // Normalize phone number (remove formatting)
    const callerPhone = callData.from.replace(/\D/g, '')

    // Get or create contact
    let contactId: string

    // Search for existing contact by phone
    const { data: existingContact } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('user_id', userId)
      .eq('phone', callerPhone)
      .single()

    if (existingContact) {
      contactId = existingContact.id
    } else {
      // Create new contact
      const { data: newContact, error: createError } = await supabaseAdmin
        .from('contacts')
        .insert({
          user_id: userId,
          name: 'Unknown Caller',
          phone: callerPhone,
          tags: ['phone_lead', 'new_lead']
        })
        .select('id')
        .single()

      if (createError) {
        throw new Error(`Failed to create contact: ${createError.message}`)
      }

      contactId = newContact.id
    }

    // Create activity event
    const formattedPhone = formatPhoneNumber(callData.from)
    const content = `Inbound call from ${formattedPhone}`
    
    const details = {
      direction: callData.direction,
      from: callData.from,
      duration: callData.duration || 0,
      status: callData.status,
      callSid: callData.callSid
    }

    const { error: eventError } = await supabaseAdmin
      .from('activity_events')
      .insert({
        user_id: userId,
        contact_id: contactId,
        event_type: 'phone_call',
        content: content,
        details: details
      })

    if (eventError) {
      throw new Error(`Failed to create activity event: ${eventError.message}`)
    }

    // Update contact's updated_at timestamp
    await supabaseAdmin
      .from('contacts')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', contactId)

    console.log(`[Call Webhook] Logged call event for user ${userId}, contact ${contactId}`)
  } catch (error: any) {
    console.error('[Call Webhook] Error logging call event:', error)
    throw error
  }
}

/**
 * Map Twilio call status to our internal status
 */
function mapCallStatus(twilioStatus: string): 'answered' | 'voicemail' | 'missed' {
  if (twilioStatus === 'completed') {
    return 'answered'
  }
  if (twilioStatus === 'busy' || twilioStatus === 'no-answer') {
    return 'missed'
  }
  // Default to missed for failed calls
  return 'missed'
}

