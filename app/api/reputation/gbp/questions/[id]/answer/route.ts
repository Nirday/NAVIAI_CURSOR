import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { publishGBPAnswerToPlatform } from '@/libs/reputation-hub/src/gbp_qa'


export const dynamic = 'force-dynamic'
/**
 * POST /api/reputation/gbp/questions/[id]/answer
 * Publish an answer to a GBP question
 */
export async function POST(
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
    const body = await req.json()
    const { answer } = body

    if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
      return NextResponse.json(
        { error: 'Answer content is required' },
        { status: 400 }
      )
    }

    const result = await publishGBPAnswerToPlatform(id, answer.trim())

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to publish answer' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Answer published successfully' })
  } catch (error: any) {
    console.error('Error publishing GBP answer:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to publish answer' },
      { status: 500 }
    )
  }
}

