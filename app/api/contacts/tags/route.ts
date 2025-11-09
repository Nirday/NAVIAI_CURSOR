import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/contacts/tags
 * Fetches all unique tags used by contacts for the authenticated user
 */
export async function GET() {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch all contacts for this user
    const { data: contacts, error } = await supabaseAdmin
      .from('contacts')
      .select('tags')
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to fetch contacts: ${error.message}`)
    }

    // Extract all unique tags
    const allTags = new Set<string>()
    for (const contact of contacts || []) {
      if (contact.tags && Array.isArray(contact.tags)) {
        contact.tags.forEach(tag => allTags.add(tag))
      }
    }

    return NextResponse.json({ tags: Array.from(allTags).sort() })
  } catch (error: any) {
    console.error('Error fetching tags:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch tags' },
      { status: 500 }
    )
  }
}

