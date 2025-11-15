import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { Broadcast } from '@/libs/communication-hub/src/types'


export const dynamic = 'force-dynamic'
/**
 * GET /api/communication/analytics/broadcasts
 * Fetches all broadcasts with analytics for the authenticated user
 */
export async function GET() {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch all broadcasts (all-time data)
    const { data: broadcasts, error } = await supabaseAdmin
      .from('broadcasts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw new Error(`Failed to fetch broadcasts: ${error.message}`)
    }

    // Format broadcasts with analytics
    const formattedBroadcasts = (broadcasts || []).map((b: any) => {
      const broadcast: Broadcast = {
        id: b.id,
        userId: b.user_id,
        audienceId: b.audience_id,
        channel: b.channel,
        content: b.content,
        abTestConfig: b.ab_test_config,
        status: b.status,
        scheduledAt: b.scheduled_at ? new Date(b.scheduled_at) : null,
        sentAt: b.sent_at ? new Date(b.sent_at) : null,
        totalRecipients: b.total_recipients,
        sentCount: b.sent_count,
        failedCount: b.failed_count,
        openCount: b.open_count,
        clickCount: b.click_count,
        createdAt: new Date(b.created_at),
        updatedAt: new Date(b.updated_at)
      }

      // Calculate rates
      const openRate = broadcast.channel === 'email' && broadcast.sentCount > 0 && broadcast.openCount
        ? (broadcast.openCount / broadcast.sentCount) * 100
        : null
      
      const clickRate = broadcast.sentCount > 0 && broadcast.clickCount
        ? (broadcast.clickCount / broadcast.sentCount) * 100
        : null

      return {
        ...broadcast,
        openRate,
        clickRate
      }
    })

    return NextResponse.json({ broadcasts: formattedBroadcasts })
  } catch (error: any) {
    console.error('Error fetching broadcast analytics:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch broadcast analytics' },
      { status: 500 }
    )
  }
}

