import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { toggleFeatureFlag, getFeatureFlag } from '@/libs/admin-center/src/data'
import { requireAdmin } from '@/libs/admin-center/src/access_control'
import { createAuditLog } from '@/libs/admin-center/src/data'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/feature-flags/[flagId]/toggle
 * Toggles a feature flag (admin only, creates audit log)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ flagId: string }> }
) {
  const { flagId } = await params
   try {
    const { flagId } = await params
    
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

    const userId = session.user.id

    // Verify admin role
    await requireAdmin(userId)

    // Get request body
    const { enabled } = await req.json()

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      )
    }

    // Get current flag state for audit log
    const currentFlag = await getFeatureFlag(flagId)
    if (!currentFlag) {
      return NextResponse.json(
        { error: 'Feature flag not found' },
        { status: 404 }
      )
    }

    // Toggle flag
    await toggleFeatureFlag(flagId, enabled)

    // Create audit log
    await createAuditLog(userId, 'feature_flag_toggled', {
      flagId: flagId,
      oldValue: currentFlag.isEnabled,
      newValue: enabled,
      description: currentFlag.description
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error toggling feature flag:', error)
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to toggle feature flag' },
      { status: 500 }
    )
  }
}

