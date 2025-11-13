import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { Contact } from '@/libs/contact-hub/src/types'


export const dynamic = 'force-dynamic'
/**
 * GET /api/contacts/[id]
 * Fetches a single contact by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    const contact: Contact = {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      tags: data.tags || [],
      isUnsubscribed: data.is_unsubscribed || false,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }

    return NextResponse.json({ contact })
  } catch (error: any) {
    console.error('Error fetching contact:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch contact' },
      { status: 500 }
    )
  }
}

