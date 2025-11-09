import { NextRequest, NextResponse } from 'next/server'
import { setWebsiteUnpublished } from '../../../../libs/website-builder/src/data'

function getAuthenticatedUserId(req: NextRequest): string | null {
  const hdr = req.headers.get('x-user-id')
  return hdr && hdr.length > 0 ? hdr : null
}

export async function POST(req: NextRequest) {
  const userId = getAuthenticatedUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await setWebsiteUnpublished(userId)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to unpublish' }, { status: 500 })
  }
}
