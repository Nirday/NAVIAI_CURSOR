import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'


export const dynamic = 'force-dynamic'
/**
 * DELETE /api/reputation/sources/[id]
 * Disconnect a review source
 */
export async function DELETE(
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
    // Verify source belongs to user
    const { data: source, error: fetchError } = await supabaseAdmin
      .from('review_sources')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !source) {
      return NextResponse.json(
        { error: 'Review source not found' },
        { status: 404 }
      )
    }

    // Delete the source
    const { error: deleteError } = await supabaseAdmin
      .from('review_sources')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (deleteError) {
      throw new Error(`Failed to delete review source: ${deleteError.message}`)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting review source:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to delete review source' },
      { status: 500 }
    )
  }
}

