import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/reputation/request-changes?token=...
 * Redirects users to reply via email instead of using a form
 * 
 * Note: For V1, changes are requested by replying to the approval email.
 * This endpoint provides a helpful message directing users to reply via email.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return renderErrorPage('Change request token is required')
    }

    // Render instruction page
    return renderInstructionPage()
  } catch (error: any) {
    console.error('Error handling change request:', error)
    return renderErrorPage('An unexpected error occurred. Please contact support.')
  }
}

/**
 * Renders instruction page for requesting changes
 */
function renderInstructionPage(): NextResponse {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Request Changes</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
        }
        .info-box {
          background: #F0FDF4;
          border: 2px solid #22C55E;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        h1 {
          color: #15803D;
        }
        p {
          color: #6B7280;
          font-size: 16px;
        }
        .step {
          margin: 15px 0;
          padding-left: 30px;
        }
      </style>
    </head>
    <body>
      <h1>Request Changes to Review Response</h1>
      <div class="info-box">
        <p><strong>To request changes:</strong></p>
        <div class="step">
          <p>1. Reply to the approval email you received</p>
          <p>2. Include your feedback or requested changes in your reply</p>
          <p>3. We'll revise the response and send you a new approval request</p>
        </div>
      </div>
      <p>Alternatively, you can manage your review responses directly from your dashboard.</p>
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
      <title>Error</title>
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
      <h1>Unable to Process Request</h1>
      <p>${message}</p>
      <p>If you need assistance, please contact support.</p>
    </body>
    </html>
  `
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' }
  })
}

