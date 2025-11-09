import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { generateAndRequestApproval } from '@/libs/reputation-hub/src/reply_assistant'

/**
 * POST /api/reputation/reviews/[id]/generate-response
 * Generates AI response suggestion and sends approval notification
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify review belongs to user
    const { data: review, error: reviewError } = await supabaseAdmin
      .from('reviews')
      .select('id, user_id, status')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    // Check if review is in a valid state for generating response
    if (review.status !== 'needs_response' && review.status !== 'response_changes_requested') {
      return NextResponse.json(
        { error: `Review is not in a valid state for generating response. Current status: ${review.status}` },
        { status: 400 }
      )
    }

    // Generate response and send approval notification
    await generateAndRequestApproval(params.id)

    return NextResponse.json({ 
      success: true,
      message: 'AI response generated and approval notification sent'
    })
  } catch (error: any) {
    console.error('Error generating response:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to generate response' },
      { status: 500 }
    )
  }
}

