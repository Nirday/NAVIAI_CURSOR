import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/libs/admin-center/src/access_control'
import { createAuditLog } from '@/libs/admin-center/src/data'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/seo-opportunities/[id]/review
 * Approves or rejects an SEO opportunity (admin only, creates audit log)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
   try {
    const { id } = await params
    
    // Get authenticated user
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // No-op for read-only operations
          },
        },
      }
    )

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUserId = session.user.id

    // Verify admin role
    await requireAdmin(adminUserId)

    // Get request body
    const { action } = await req.json()

    if (action !== 'approved' && action !== 'rejected') {
      return NextResponse.json(
        { error: 'action must be "approved" or "rejected"' },
        { status: 400 }
      )
    }

    // Get current opportunity for audit log
    const { data: oppData, error: oppError } = await supabaseAdmin
      .from('seo_opportunities')
      .select('*')
      .eq('id', id)
      .eq('status', 'pending_review')
      .single()

    if (oppError || !oppData) {
      return NextResponse.json(
        { error: 'Opportunity not found or already reviewed' },
        { status: 404 }
      )
    }

    // Update status
    const { error: updateError } = await supabaseAdmin
      .from('seo_opportunities')
      .update({
        status: action
      })
      .eq('id', id)

    if (updateError) {
      throw new Error(`Failed to update opportunity: ${updateError.message}`)
    }

    // Create audit log
    await createAuditLog(adminUserId, 'seo_opportunity_reviewed', {
      opportunityId: id,
      opportunityTitle: oppData.title,
      action: action,
      previousStatus: 'pending_review'
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error reviewing SEO opportunity:', error)
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to review opportunity' },
      { status: 500 }
    )
  }
}

