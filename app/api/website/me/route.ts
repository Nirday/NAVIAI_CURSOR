import { NextRequest, NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getWebsiteByUserId } from '../../../../libs/website-builder/src/data'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Try to get userId from header first (for backward compatibility with WebsiteEditor)
    const hdrs = await headers()
    let userId = hdrs.get('x-user-id')

    // If not in header, get from session cookie
    if (!userId) {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key',
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

      if (session?.user?.id) {
        userId = session.user.id
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const website = await getWebsiteByUserId(userId)
    return NextResponse.json({ website })
  } catch (e: any) {
    console.error('Error in /api/website/me:', e)
    return NextResponse.json({ error: e?.message || 'Failed to load website' }, { status: 500 })
  }
}
