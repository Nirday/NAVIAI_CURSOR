import { NextRequest, NextResponse } from 'next/server'
import { handleApproval, handleEditRequest, parseSMSReply } from '../../../../libs/content-engine/src/approval_workflow'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Webhook endpoint for Twilio SMS replies
 * POST /api/content/sms-webhook
 * 
 * This endpoint receives SMS webhooks from Twilio when users reply to approval messages
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const fromEntry = formData.get('From')
    const bodyEntry = formData.get('Body')
    
    const from = typeof fromEntry === 'string' ? fromEntry : null
    const body = typeof bodyEntry === 'string' ? bodyEntry : null

    if (!from || !body) {
      return NextResponse.json(
        { error: 'Missing From or Body' },
        { status: 400 }
      )
    }

    // Find user by phone number
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('business_profiles')
      .select('user_id, contact_info')
      .limit(1000) // Get all profiles (in production, might want to index phone)

    if (profileError) {
      throw new Error(`Failed to fetch profiles: ${profileError.message}`)
    }

    // Find matching phone number (normalize for comparison)
    const normalizedFrom = from.replace(/\D/g, '') // Remove non-digits
    const matchingProfile = profileData?.find((profile: any) => {
      const phone = profile.contact_info?.phone
      if (!phone) return false
      const normalizedPhone = phone.replace(/\D/g, '')
      return normalizedPhone.endsWith(normalizedFrom) || normalizedFrom.endsWith(normalizedPhone)
    })

    if (!matchingProfile) {
      console.warn(`No profile found for phone number: ${from}`)
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, we couldn\'t find your account. Please contact support.</Message></Response>', {
        headers: { 'Content-Type': 'text/xml' }
      })
    }

    // Find pending approval post for this user
    const { data: postData, error: postError } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .eq('user_id', matchingProfile.user_id)
      .eq('status', 'pending_approval')
      .not('approval_token', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (postError || !postData) {
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>No pending content found for approval.</Message></Response>', {
        headers: { 'Content-Type': 'text/xml' }
      })
    }

    const action = parseSMSReply(body)
    const token = postData.approval_token

    if (action === 'approve') {
      // Handle approval
      await handleApproval(token)
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>✅ Approved! Your content will be published according to schedule.</Message></Response>', {
        headers: { 'Content-Type': 'text/xml' }
      })
    } else {
      // Handle edit request
      await handleEditRequest(token, body)
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>✏️ Got it! We\'re revising the content based on your feedback. You\'ll receive a new approval request shortly.</Message></Response>', {
        headers: { 'Content-Type': 'text/xml' }
      })
    }
  } catch (error: any) {
    console.error('Error processing SMS webhook:', error)
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, something went wrong. Please try again or contact support.</Message></Response>', {
      headers: { 'Content-Type': 'text/xml' },
      status: 500
    })
  }
}

