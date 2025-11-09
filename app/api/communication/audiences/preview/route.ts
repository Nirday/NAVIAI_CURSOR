import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { fetchContactsForEmailBroadcast, fetchContactsForSmsBroadcast } from '@/libs/communication-hub/src/contact_adapter'

/**
 * POST /api/communication/audiences/preview
 * Previews audience size based on channel and tags
 */
export async function POST(req: NextRequest) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { channel, tags } = body

    if (!channel || !['email', 'sms'].includes(channel)) {
      return NextResponse.json(
        { error: 'Channel must be "email" or "sms"' },
        { status: 400 }
      )
    }

    // Fetch contacts based on channel
    const contacts = channel === 'email'
      ? await fetchContactsForEmailBroadcast(userId, tags || [])
      : await fetchContactsForSmsBroadcast(userId, tags || [])

    return NextResponse.json({
      count: contacts.length,
      contacts: contacts.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone
      }))
    })
  } catch (error: any) {
    console.error('Error previewing audience:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to preview audience' },
      { status: 500 }
    )
  }
}

