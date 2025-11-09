import { NextRequest, NextResponse } from 'next/server'
import { handleEditRequest } from '../../../../libs/content-engine/src/approval_workflow'

/**
 * API endpoint for requesting changes to blog posts via email link
 * GET /api/content/request-changes?token=...
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Redirect to a form where user can provide feedback
    return NextResponse.redirect(
      new URL(`/dashboard/content/request-changes?token=${token}`, req.url)
    )
  } catch (error: any) {
    console.error('Error handling change request:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to process request' },
      { status: 500 }
    )
  }
}

/**
 * API endpoint for submitting feedback for changes
 * POST /api/content/request-changes
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, feedback } = body

    if (!token || !feedback) {
      return NextResponse.json(
        { error: 'Token and feedback are required' },
        { status: 400 }
      )
    }

    const postId = await handleEditRequest(token, feedback)

    return NextResponse.json({
      success: true,
      message: 'Your feedback has been received. The content will be revised and sent back for approval.',
      postId
    })
  } catch (error: any) {
    console.error('Error handling edit request:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to process edit request' },
      { status: 500 }
    )
  }
}

