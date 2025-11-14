/**
 * Central Inbound SMS Webhook Handler
 * Processes all SMS replies from users (Content approvals, Review approvals, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { handleApproval as handleContentApproval, parseSMSReply } from '@/libs/content-engine/src/approval_workflow'

/**
 * POST /api/inbound/sms
 * Central webhook endpoint for processing all inbound SMS replies
 * 
 * This endpoint receives SMS webhooks from Twilio when users reply to messages
 * It routes to the appropriate handler based on what's pending for the user
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const fromEntry = formData.get('From')
    const bodyEntry = formData.get('Body')
    
    const from = typeof fromEntry === 'string' ? fromEntry : null
    const body = typeof bodyEntry === 'string' ? bodyEntry : null

    if (!from || !body) {
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Missing required fields.</Message></Response>', {
        headers: { 'Content-Type': 'text/xml' },
        status: 400
      })
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

    const userId = matchingProfile.user_id

    // Check for pending review approval first (Task 8.6)
    const { data: reviewData, error: reviewError } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'response_pending_approval')
      .not('approval_token', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!reviewError && reviewData) {
      // Handle review approval
      return await handleReviewApprovalSMS(reviewData, body)
    }

    // Check for pending content approval (Module 3)
    const { data: postData, error: postError } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending_approval')
      .not('approval_token', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!postError && postData) {
      // Handle content approval (existing logic)
      const action = parseSMSReply(body)
      const token = postData.approval_token

      if (action === 'approve') {
        await handleContentApproval(token)
        return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>✅ Approved! Your content will be published according to schedule.</Message></Response>', {
          headers: { 'Content-Type': 'text/xml' }
        })
      } else {
        // Handle edit request (Task 8.7 for reviews, existing for content)
        const { handleEditRequest } = await import('@/libs/content-engine/src/approval_workflow')
        await handleEditRequest(token, body)
        return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>✏️ Got it! We\'re revising the content based on your feedback. You\'ll receive a new approval request shortly.</Message></Response>', {
          headers: { 'Content-Type': 'text/xml' }
        })
      }
    }

    // No pending approvals found
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>No pending approvals found. If you expected to approve something, please check your dashboard.</Message></Response>', {
      headers: { 'Content-Type': 'text/xml' }
    })
  } catch (error: any) {
    console.error('Error processing SMS webhook:', error)
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, something went wrong. Please try again or contact support.</Message></Response>', {
      headers: { 'Content-Type': 'text/xml' },
      status: 500
    })
  }
}

/**
 * Handles review approval via SMS
 */
async function handleReviewApprovalSMS(reviewData: any, smsBody: string): Promise<NextResponse> {
  const token = reviewData.approval_token
  const normalizedBody = smsBody.trim().toUpperCase()

  // Check if it's an approval (YES)
  if (normalizedBody === 'YES' || normalizedBody === 'Y' || normalizedBody === 'APPROVE') {
    // Validate token and expiry
    if (reviewData.approval_token_expires_at) {
      const expiresAt = new Date(reviewData.approval_token_expires_at)
      const now = new Date()
      
      if (now > expiresAt) {
        return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, we couldn\'t process that approval. The approval link has expired. Please request a new approval from your dashboard.</Message></Response>', {
          headers: { 'Content-Type': 'text/xml' }
        })
      }
    }

    // Check status is still pending
    if (reviewData.status !== 'response_pending_approval') {
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, we couldn\'t process that approval. It may have already been approved.</Message></Response>', {
        headers: { 'Content-Type': 'text/xml' }
      })
    }

    // Update review status to approved and invalidate token
    const { error: updateError } = await supabaseAdmin
      .from('reviews')
      .update({
        status: 'response_approved',
        approval_token: null // Invalidate token (single-use)
      })
      .eq('id', reviewData.id)

    if (updateError) {
      console.error('Error updating review status:', updateError)
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, we couldn\'t process that approval. Please try again or contact support.</Message></Response>', {
        headers: { 'Content-Type': 'text/xml' }
      })
    }

    // Send confirmation SMS
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>✅ Approved! Your review response will be posted to the platform shortly.</Message></Response>', {
      headers: { 'Content-Type': 'text/xml' }
    })
    } else {
      // Not "YES" - treat as change request (Task 8.7)
      // Handle edit request
      try {
        const { handleEditRequest } = await import('@/libs/reputation-hub/src/reply_assistant')
        await handleEditRequest(reviewData.id, smsBody)
        return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>✏️ Got it! We\'re revising the response based on your feedback. You\'ll receive a new approval request shortly.</Message></Response>', {
          headers: { 'Content-Type': 'text/xml' }
        })
      } catch (error: any) {
        console.error('[SMS Webhook] Error handling review edit request:', error)
        // Leave status as 'response_changes_requested' per error handling requirements
        return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, we couldn\'t process your feedback. Please try again or contact support.</Message></Response>', {
          headers: { 'Content-Type': 'text/xml' }
        })
      }
    }
}

