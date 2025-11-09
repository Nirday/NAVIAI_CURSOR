import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { Contact } from '@/libs/contact-hub/src/types'

/**
 * GET /api/contacts
 * Fetches all contacts for the authenticated user
 * Supports search and tag filtering
 */
export async function GET(req: NextRequest) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = req.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const tagFilter = searchParams.get('tag') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    let query = supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('user_id', userId)

    // Apply search filter (name, email, phone)
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    // Apply tag filter
    if (tagFilter) {
      query = query.contains('tags', [tagFilter])
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch contacts: ${error.message}`)
    }

    const contacts: Contact[] = (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      tags: row.tags || [],
      isUnsubscribed: row.is_unsubscribed || false,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }))

    return NextResponse.json({ contacts })
  } catch (error: any) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch contacts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/contacts
 * Creates a new contact
 */
export async function POST(req: NextRequest) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { firstName, lastName, email, phone, tags } = body

    // Validate required field
    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check for duplicate email
    const { data: existing } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('user_id', userId)
      .eq('email', email.trim())
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A contact with this email already exists' },
        { status: 400 }
      )
    }

    // Build name
    const name = [firstName, lastName].filter(Boolean).join(' ').trim() || email.trim()

    // Create contact
    const { data: newContact, error } = await supabaseAdmin
      .from('contacts')
      .insert({
        user_id: userId,
        name,
        email: email.trim(),
        phone: phone?.trim() || null,
        tags: tags || [],
        is_unsubscribed: false
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create contact: ${error.message}`)
    }

    const contact: Contact = {
      id: newContact.id,
      userId: newContact.user_id,
      name: newContact.name,
      email: newContact.email,
      phone: newContact.phone,
      tags: newContact.tags || [],
      isUnsubscribed: newContact.is_unsubscribed || false,
      createdAt: new Date(newContact.created_at),
      updatedAt: new Date(newContact.updated_at)
    }

    return NextResponse.json({ contact })
  } catch (error: any) {
    console.error('Error creating contact:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create contact' },
      { status: 500 }
    )
  }
}

