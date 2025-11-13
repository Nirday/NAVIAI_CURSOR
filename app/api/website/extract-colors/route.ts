import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { extractColorsFromUrl, extractColorsFromImageBuffer, extractColorsFromWebsiteUrl, generateColorPalette } from '@/libs/website-builder/src/color_extractor'


export const dynamic = 'force-dynamic'
/**
 * POST /api/website/extract-colors
 * Extract color palette from an image URL, uploaded image, or website URL
 * 
 * Body:
 *   - imageUrl (optional): URL of an image to extract colors from
 *   - websiteUrl (optional): URL of a website to extract theme colors from
 *   - image (optional): Base64 encoded image data
 *   - preferDark (optional): Prefer dark theme palette
 *   - preferLight (optional): Prefer light theme palette
 */
export async function POST(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Try to parse as JSON first, then FormData
    let body: any = {}
    let formData: FormData | null = null
    
    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('application/json')) {
      body = await req.json()
    } else if (contentType.includes('multipart/form-data')) {
      formData = await req.formData()
    } else {
      // Try JSON, fallback to FormData
      try {
        body = await req.json()
      } catch {
        formData = await req.formData()
      }
    }
    
    // Support both JSON and FormData
    const imageUrl = (formData?.get('imageUrl') as string) || body.imageUrl
    const websiteUrl = (formData?.get('websiteUrl') as string) || body.websiteUrl
    const imageBase64 = (formData?.get('image') as string) || body.image
    const preferDark = (formData?.get('preferDark') === 'true') || body.preferDark === true
    const preferLight = (formData?.get('preferLight') === 'true') || body.preferLight === true

    if (!imageUrl && !websiteUrl && !imageBase64) {
      return NextResponse.json(
        { error: 'Either imageUrl, websiteUrl, or image (base64) is required' },
        { status: 400 }
      )
    }

    let extractedColors

    if (websiteUrl) {
      // Extract colors from a website URL
      extractedColors = await extractColorsFromWebsiteUrl(websiteUrl)
    } else if (imageUrl) {
      // Extract colors from an image URL
      extractedColors = await extractColorsFromUrl(imageUrl)
    } else if (imageBase64) {
      // Extract colors from uploaded image (base64)
      // Remove data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
      const imageBuffer = Buffer.from(base64Data, 'base64')
      extractedColors = await extractColorsFromImageBuffer(imageBuffer)
    } else {
      return NextResponse.json(
        { error: 'Invalid input: provide imageUrl, websiteUrl, or image' },
        { status: 400 }
      )
    }

    if (!extractedColors || extractedColors.length === 0) {
      return NextResponse.json(
        { error: 'Failed to extract colors from the provided source' },
        { status: 500 }
      )
    }

    // Generate a cohesive color palette
    const colorPalette = await generateColorPalette(extractedColors, {
      preferDark,
      preferLight
    })

    return NextResponse.json({
      success: true,
      extractedColors,
      colorPalette,
      message: `Extracted ${extractedColors.length} colors and generated a cohesive palette`
    })
  } catch (error: any) {
    console.error('Error extracting colors:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to extract colors' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/website/extract-colors
 * Get information about the color extraction service
 */
export async function GET() {
  return NextResponse.json({
    service: 'Color Extraction',
    description: 'Extract color palettes from images or websites',
    supportedFormats: {
      imageUrl: 'URL to an image (JPG, PNG, etc.)',
      websiteUrl: 'URL to a website (extracts theme colors)',
      image: 'Base64 encoded image data'
    },
    options: {
      preferDark: 'Generate a dark theme palette',
      preferLight: 'Generate a light theme palette'
    },
    example: {
      method: 'POST',
      body: {
        imageUrl: 'https://example.com/image.jpg',
        preferLight: true
      }
    }
  })
}

