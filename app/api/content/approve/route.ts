import { NextRequest, NextResponse } from 'next/server'
import { handleApproval } from '../../../../libs/content-engine/src/approval_workflow'

/**
 * API endpoint for approving blog posts via email link
 * GET /api/content/approve?token=...
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Approval token is required' },
        { status: 400 }
      )
    }

    const postId = await handleApproval(token)

    // Redirect to success page or return JSON
    return NextResponse.redirect(
      new URL(`/dashboard/content?approved=${postId}`, req.url)
    )
  } catch (error: any) {
    console.error('Error handling approval:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to approve content' },
      { status: 500 }
    )
  }
}

