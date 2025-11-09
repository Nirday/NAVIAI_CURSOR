/**
 * Central Inbound Email Webhook Handler
 * Processes all email replies from users (Content approvals, Review approvals, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { handleEditRequest as handleReviewEditRequest } from '@/libs/reputation-hub/src/reply_assistant'
import { handleEditRequest as handleContentEditRequest } from '@/libs/content-engine/src/approval_workflow'

/**
 * POST /api/inbound/email
 * Central webhook endpoint for processing all inbound email replies
 * 
 * This endpoint receives email webhooks from Resend/Mailgun when users reply to approval emails
 * It routes to the appropriate handler based on the approval token in the email header
 */
export async function POST(req: NextRequest) {
  try {
    // Parse email webhook payload (format depends on provider - Resend/Mailgun)
    const body = await req.json()
    
    // Extract email content and headers
    // Resend format: { from, to, subject, text, html, headers }
    // Mailgun format: { 'sender', 'recipient', 'subject', 'body-plain', 'body-html', message-headers }
    const emailFrom = body.from || body.sender || ''
    const emailTo = body.to || body.recipient || ''
    const emailSubject = body.subject || ''
    const emailText = body.text || body['body-plain'] || ''
    const emailHtml = body.html || body['body-html'] || ''
    const headers = body.headers || body['message-headers'] || []

    if (!emailFrom || !emailText) {
      return NextResponse.json(
        { error: 'Missing required email fields' },
        { status: 400 }
      )
    }

    // Extract approval token from custom header
    // Look for X-Navi-Approval-Token header
    let approvalToken: string | null = null
    
    if (Array.isArray(headers)) {
      // Mailgun format: array of [name, value] pairs
      const tokenHeader = headers.find((h: any) => 
        Array.isArray(h) && h[0]?.toLowerCase() === 'x-navi-approval-token'
      )
      if (tokenHeader && Array.isArray(tokenHeader) && tokenHeader[1]) {
        approvalToken = tokenHeader[1]
      }
    } else if (typeof headers === 'object') {
      // Resend format: object with header names as keys
      approvalToken = headers['X-Navi-Approval-Token'] || headers['x-navi-approval-token'] || null
    }

    // If no header, try to extract from reply-to or subject (fallback)
    if (!approvalToken) {
      // For V1, we'll rely on the header. If missing, we can't identify the review.
      // This will fail silently per error handling requirements
      console.warn('[Email Webhook] No approval token found in email headers')
      return NextResponse.json({ success: true, message: 'No approval token found, ignoring' })
    }

    // Parse feedback from email body
    const userFeedback = parseEmailFeedback(emailText, emailHtml)

    if (!userFeedback || userFeedback.trim().length === 0) {
      console.warn('[Email Webhook] No feedback text found in email body')
      return NextResponse.json({ success: true, message: 'No feedback text found, ignoring' })
    }

    // Try to find review by approval token (Task 8.7)
    const { data: reviewData, error: reviewError } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('approval_token', approvalToken)
      .in('status', ['response_pending_approval', 'response_changes_requested'])
      .maybeSingle()

    if (!reviewError && reviewData) {
      // Handle review edit request
      try {
        await handleReviewEditRequest(reviewData.id, userFeedback)
        return NextResponse.json({ success: true, message: 'Review edit request processed' })
      } catch (error: any) {
        console.error('[Email Webhook] Error handling review edit request:', error)
        // Leave status as 'response_changes_requested' per error handling requirements
        return NextResponse.json(
          { error: 'Failed to process review edit request' },
          { status: 500 }
        )
      }
    }

    // Try to find content approval by token (Module 3)
    const { data: postData, error: postError } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .eq('approval_token', approvalToken)
      .in('status', ['pending_approval', 'changes_requested'])
      .maybeSingle()

    if (!postError && postData) {
      // Handle content edit request
      try {
        await handleContentEditRequest(approvalToken, userFeedback)
        return NextResponse.json({ success: true, message: 'Content edit request processed' })
      } catch (error: any) {
        console.error('[Email Webhook] Error handling content edit request:', error)
        return NextResponse.json(
          { error: 'Failed to process content edit request' },
          { status: 500 }
        )
      }
    }

    // No matching approval found - fail silently
    console.warn(`[Email Webhook] No matching approval found for token: ${approvalToken}`)
    return NextResponse.json({ success: true, message: 'No matching approval found, ignoring' })
  } catch (error: any) {
    console.error('[Email Webhook] Error processing email:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to process email' },
      { status: 500 }
    )
  }
}

/**
 * Parses feedback from email body, removing quoted/forwarded content
 */
function parseEmailFeedback(emailText: string, emailHtml: string): string {
  // Use text version if available (cleaner), otherwise parse HTML
  let text = emailText.trim()

  if (!text && emailHtml) {
    // Basic HTML stripping (for V1, we'll rely on provider's text version)
    // In production, use a proper HTML parser
    text = emailHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }

  if (!text) {
    return ''
  }

  // Remove common reply prefixes
  text = text.replace(/^(Re|RE|Fwd|FWD):\s*/i, '')
  text = text.replace(/^On\s+.*?wrote:.*$/im, '')
  text = text.replace(/^From:.*$/im, '')
  text = text.replace(/^To:.*$/im, '')
  text = text.replace(/^Subject:.*$/im, '')
  text = text.replace(/^Date:.*$/im, '')

  // Remove quoted content (lines starting with >)
  const lines = text.split('\n')
  const feedbackLines: string[] = []
  let inQuotedSection = false

  for (const line of lines) {
    // Check if line starts with > (quoted text)
    if (line.trim().startsWith('>')) {
      inQuotedSection = true
      continue
    }

    // Check for common email separators
    if (line.includes('-----') || line.includes('_____') || line.includes('Original Message')) {
      inQuotedSection = true
      continue
    }

    // Check for "On [date]" patterns
    if (/^On\s+\w+,\s+\w+\s+\d+/.test(line)) {
      inQuotedSection = true
      continue
    }

    // If we're not in quoted section, add the line
    if (!inQuotedSection) {
      feedbackLines.push(line)
    }
  }

  const feedback = feedbackLines.join('\n').trim()

  // If feedback is too short or seems empty, return empty
  if (feedback.length < 3) {
    return ''
  }

  return feedback
}

