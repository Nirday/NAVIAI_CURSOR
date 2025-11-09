import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * PATCH /api/contacts/[id]/tags
 * Updates tags for a contact
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { tags } = body

    if (!Array.isArray(tags)) {
      return NextResponse.json(
        { error: 'Tags must be an array' },
        { status: 400 }
      )
    }

    // Verify contact belongs to user
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // Update tags
    const { data: updated, error } = await supabaseAdmin
      .from('contacts')
      .update({
        tags: tags,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update tags: ${error.message}`)
    }

    return NextResponse.json({
      contact: {
        id: updated.id,
        tags: updated.tags || []
      }
    })
  } catch (error: any) {
    console.error('Error updating contact tags:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update tags' },
      { status: 500 }
    )
  }
}

