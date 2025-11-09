import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/reputation/approve?token=...
 * Handles review response approval via email link
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return renderErrorPage('Approval token is required')
    }

    // Validate token and find review
    const { data: reviewData, error: findError } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('approval_token', token)
      .eq('status', 'response_pending_approval')
      .single()

    if (findError || !reviewData) {
      return renderErrorPage('This approval link is expired or has already been used. No further action is needed.')
    }

    // Check token expiry (7 days)
    if (reviewData.approval_token_expires_at) {
      const expiresAt = new Date(reviewData.approval_token_expires_at)
      const now = new Date()
      
      if (now > expiresAt) {
        return renderErrorPage('This approval link has expired. Please request a new approval link from your dashboard.')
      }
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
      return renderErrorPage('Failed to process approval. Please try again or contact support.')
    }

    // Render success page
    return renderSuccessPage()
  } catch (error: any) {
    console.error('Error handling approval:', error)
    return renderErrorPage('An unexpected error occurred. Please contact support.')
  }
}

/**
 * Renders success page
 */
function renderSuccessPage(): NextResponse {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Response Approved</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
          text-align: center;
        }
        .success-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        h1 {
          color: #15803D;
          margin-bottom: 20px;
        }
        p {
          color: #6B7280;
          font-size: 16px;
        }
      </style>
    </head>
    <body>
      <div class="success-icon">✅</div>
      <h1>Response Approved!</h1>
      <p>Your review response has been approved and will be published to the platform shortly.</p>
      <p>You can close this window.</p>
    </body>
    </html>
  `
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' }
  })
}

/**
 * Renders error page
 */
function renderErrorPage(message: string): NextResponse {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Approval Error</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
          text-align: center;
        }
        .error-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        h1 {
          color: #DC2626;
          margin-bottom: 20px;
        }
        p {
          color: #6B7280;
          font-size: 16px;
        }
      </style>
    </head>
    <body>
      <div class="error-icon">⚠️</div>
      <h1>Unable to Process Approval</h1>
      <p>${message}</p>
      <p>If you need assistance, please contact support.</p>
    </body>
    </html>
  `
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' }
  })
}

