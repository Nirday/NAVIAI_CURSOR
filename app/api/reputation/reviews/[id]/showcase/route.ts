import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { triggerShowcaseAction } from '@/libs/reputation-hub/src/showcase_handler'


export const dynamic = 'force-dynamic'
/**
 * POST /api/reputation/reviews/[id]/showcase
 * Triggers a showcase action for a review (website or social)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
   const { id: reviewId } = params
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { actionType } = await req.json()

    if (!actionType || !['website', 'social'].includes(actionType)) {
      return NextResponse.json(
        { error: 'Invalid action type. Must be "website" or "social".' },
        { status: 400 }
      )
    }

    await triggerShowcaseAction(reviewId, actionType)

    const successMessage = actionType === 'website'
      ? 'Review sent to your website!'
      : 'Draft created in your Social Hub!'

    return NextResponse.json({ success: true, message: successMessage })
  } catch (error: any) {
    console.error(`[Showcase API] Error showcasing review ${reviewId}:`, error)
    
    // Log critical error if it's a database/system error
    if (error.message?.includes('dispatch') || error.message?.includes('database')) {
      console.error(`[Showcase API] CRITICAL: Failed to dispatch action command for review ${reviewId}`)
    }

    return NextResponse.json(
      { 
        error: error.message || 'Could not showcase review. Please try again.',
        success: false
      },
      { status: 500 }
    )
  }
}

