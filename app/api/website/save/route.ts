import { NextRequest, NextResponse } from 'next/server'
import { upsertWebsiteDraft } from '../../../../libs/website-builder/src/data'
import { Website } from '../../../../libs/website-builder/src/types'
import { sanitizeHtml } from '../../../../libs/website-builder/src/sanitize'

function getAuthenticatedUserId(req: NextRequest): string | null {
  // Placeholder: in real app, derive from session/cookies
  const hdr = req.headers.get('x-user-id')
  return hdr && hdr.length > 0 ? hdr : null
}

function sanitizeWebsite(website: Website): Website {
  const sanitized = { ...website }
  sanitized.pages = website.pages.map((p) => ({
    ...p,
    sections: p.sections.map((s) => {
      if (s.type === 'embed') {
        return { ...s, htmlContent: sanitizeHtml(s.htmlContent) }
      }
      return s
    })
  }))
  return sanitized
}

export async function POST(req: NextRequest) {
  const userId = getAuthenticatedUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const website = body?.website as Website
    if (!website || website.userId !== userId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const sanitized = sanitizeWebsite(website)
    await upsertWebsiteDraft(userId, sanitized)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save' }, { status: 500 })
  }
}
