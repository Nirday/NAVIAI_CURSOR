import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'


export const dynamic = 'force-dynamic'
/**
 * GET /api/communication/contacts/tags
 * Fetches all unique tags from contacts for the authenticated user
 * Used for audience filtering in broadcast creation
 */
export async function GET() {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch all contacts for the user
    const { data: contacts, error } = await supabaseAdmin
      .from('contacts')
      .select('tags')
      .eq('user_id', userId)
    
    if (error) {
      throw new Error(`Failed to fetch contacts: ${error.message}`)
    }

    // Extract all unique tags
    const allTags = new Set<string>()
    contacts?.forEach(contact => {
      if (contact.tags && Array.isArray(contact.tags)) {
        contact.tags.forEach((tag: string) => allTags.add(tag))
      }
    })

    const uniqueTags = Array.from(allTags).sort()

    return NextResponse.json({ tags: uniqueTags })
  } catch (error: any) {
    console.error('Error fetching tags:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch tags' },
      { status: 500 }
    )
  }
}

