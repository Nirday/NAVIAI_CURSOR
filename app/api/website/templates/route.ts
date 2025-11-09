import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getAllTemplates, getRecommendedTemplates, getTemplatesByCategory, getTemplatesForIndustry, getTemplatesByVisualStyle } from '@/libs/website-builder/src/templates'

/**
 * GET /api/website/templates
 * Get available website templates
 * Query params: 
 *   - category (optional): Filter by category
 *   - industry (optional): Filter by industry or get recommended
 *   - visualStyle (optional): Filter by visual design style (modern, minimalistic, professional, bold, elegant, creative, classic, vibrant)
 *   - recommended (optional): Get recommended templates for industry
 */
export async function GET(req: NextRequest) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = req.nextUrl.searchParams
    const category = searchParams.get('category')
    const industry = searchParams.get('industry')
    const visualStyle = searchParams.get('visualStyle')
    const recommended = searchParams.get('recommended') === 'true'

    let templates

    if (recommended && industry) {
      // Get recommended templates for the industry
      templates = getRecommendedTemplates(industry)
    } else if (visualStyle) {
      // Get templates by visual style (modern, minimalistic, professional, etc.)
      templates = getTemplatesByVisualStyle(visualStyle as any)
    } else if (category) {
      // Get templates by category
      templates = getTemplatesByCategory(category as any)
    } else if (industry) {
      // Get templates suitable for industry
      templates = getTemplatesForIndustry(industry)
    } else {
      // Get all templates
      templates = getAllTemplates()
    }

    return NextResponse.json({ 
      templates,
      count: templates.length,
      // Include metadata about available visual styles
      availableVisualStyles: ['modern', 'minimalistic', 'professional', 'bold', 'elegant', 'creative', 'classic', 'vibrant']
    })
  } catch (error: any) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

