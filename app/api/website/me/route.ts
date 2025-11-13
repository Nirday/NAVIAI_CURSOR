import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getWebsiteByUserId } from '../../../../libs/website-builder/src/data'


export const dynamic = 'force-dynamic'
export async function GET() {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const website = await getWebsiteByUserId(userId)
    return NextResponse.json({ website })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load website' }, { status: 500 })
  }
}
