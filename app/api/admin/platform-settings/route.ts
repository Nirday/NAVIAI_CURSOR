import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSuperAdmin } from '@/libs/admin-center/src/access_control'
import { getAllPlatformSettings, getPlatformSetting, updatePlatformSetting } from '@/libs/admin-center/src/data'
import { createAuditLog } from '@/libs/admin-center/src/data'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/platform-settings
 * Fetches all platform settings (super admin only)
 */
export async function GET(req: NextRequest) {
  try {
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

    // Verify super admin role
    await requireSuperAdmin(session.user.id)

    // Fetch all settings
    const settings = await getAllPlatformSettings()

    return NextResponse.json({ settings })
  } catch (error: any) {
    console.error('Error fetching platform settings:', error)
    if (error.message === 'Super admin access required') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/platform-settings
 * Updates platform settings (super admin only)
 */
export async function POST(req: NextRequest) {
  try {
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

    const superAdminUserId = session.user.id

    // Verify super admin role
    await requireSuperAdmin(superAdminUserId)

    // Get request body
    const { updates } = await req.json()

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request: updates object is required' },
        { status: 400 }
      )
    }

    // Validate and update each setting
    const updateResults = []
    for (const [key, newValue] of Object.entries(updates)) {
      if (typeof newValue !== 'string') {
        return NextResponse.json(
          { error: `Invalid value for ${key}: must be a string` },
          { status: 400 }
        )
      }

      // Get existing setting
      const existingSetting = await getPlatformSetting(key)
      if (!existingSetting) {
        return NextResponse.json(
          { error: `Setting not found: ${key}` },
          { status: 404 }
        )
      }

      // Check if setting is editable
      if (!existingSetting.isEditableByAdmin) {
        return NextResponse.json(
          { error: `Setting ${key} is not editable by admins` },
          { status: 403 }
        )
      }

      // Validate value based on key
      const validationError = validateSettingValue(key, newValue)
      if (validationError) {
        return NextResponse.json(
          { error: validationError },
          { status: 400 }
        )
      }

      // Update setting
      await updatePlatformSetting(key, newValue, superAdminUserId)

      // Create audit log
      await createAuditLog(superAdminUserId, 'platform_setting_updated', {
        settingKey: key,
        oldValue: existingSetting.value,
        newValue: newValue
      })

      updateResults.push({
        key,
        oldValue: existingSetting.value,
        newValue: newValue
      })
    }

    return NextResponse.json({
      success: true,
      updated: updateResults
    })
  } catch (error: any) {
    console.error('Error updating platform settings:', error)
    if (error.message === 'Super admin access required') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    )
  }
}

/**
 * Validates a setting value based on its key
 */
function validateSettingValue(key: string, value: string): string | null {
  if (key === 'defaultTrialLengthDays') {
    // Must be a positive integer
    const numValue = parseInt(value, 10)
    if (isNaN(numValue) || numValue <= 0 || numValue.toString() !== value.trim()) {
      return 'defaultTrialLengthDays must be a positive integer'
    }
    // Reasonable upper bound (e.g., 365 days)
    if (numValue > 365) {
      return 'defaultTrialLengthDays cannot exceed 365 days'
    }
  }

  // Add validation for other settings as needed
  // For now, just ensure it's not empty
  if (value.trim().length === 0) {
    return 'Setting value cannot be empty'
  }

  return null
}

