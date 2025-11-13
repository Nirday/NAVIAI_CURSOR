import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getWebsiteByUserId, upsertWebsiteDraft } from '@/libs/website-builder/src/data'
import { ColorPalette } from '@/libs/website-builder/src/color_extractor'
import { Website } from '@/libs/website-builder/src/types'


export const dynamic = 'force-dynamic'
/**
 * POST /api/website/apply-colors
 * Apply a custom color palette to the user's website
 * 
 * Body:
 *   - colorPalette: ColorPalette object with primary, secondary, accent, background, surface, text
 *   - preserveFonts (optional): Keep existing fonts (default: true)
 */
export async function POST(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { colorPalette, preserveFonts = true } = body

    if (!colorPalette) {
      return NextResponse.json(
        { error: 'colorPalette is required' },
        { status: 400 }
      )
    }

    // Validate color palette
    const requiredColors = ['primary', 'secondary', 'accent', 'background', 'surface', 'text']
    for (const color of requiredColors) {
      if (!colorPalette[color as keyof ColorPalette]) {
        return NextResponse.json(
          { error: `Missing required color: ${color}` },
          { status: 400 }
        )
      }
    }

    // Get current website
    const website = await getWebsiteByUserId(userId)
    if (!website) {
      return NextResponse.json(
        { error: 'Website not found. Please create a website first.' },
        { status: 404 }
      )
    }

    // Apply color palette to website theme
    const updatedWebsite: Website = {
      ...website,
      theme: {
        ...website.theme,
        colorPalette: {
          primary: colorPalette.primary,
          secondary: colorPalette.secondary,
          accent: colorPalette.accent,
          background: colorPalette.background,
          surface: colorPalette.surface,
          text: colorPalette.text
        },
        // Preserve fonts if requested
        font: preserveFonts ? website.theme.font : website.theme.font
      }
    }

    // Save updated website
    await upsertWebsiteDraft(userId, updatedWebsite)

    return NextResponse.json({
      success: true,
      message: 'Color palette applied successfully',
      website: {
        id: updatedWebsite.id,
        theme: updatedWebsite.theme
      }
    })
  } catch (error: any) {
    console.error('Error applying colors:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to apply color palette' },
      { status: 500 }
    )
  }
}

