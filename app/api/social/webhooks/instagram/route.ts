import { NextRequest, NextResponse } from 'next/server'
import { processInboundWebhook } from '@/libs/social-hub/src/inbox_fetcher'

/**
 * Instagram Webhook Endpoint
 * GET: Webhook verification
 * POST: Process incoming webhook events
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Webhook verification
  if (mode === 'subscribe' && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    
    // Process webhook
    await processInboundWebhook('instagram', payload)
    
    // Instagram requires 200 OK response
    return new NextResponse('OK', { status: 200 })
  } catch (error: any) {
    console.error('[Instagram Webhook] Error:', error)
    // Still return 200 to avoid retries
    return new NextResponse('Error', { status: 200 })
  }
}

