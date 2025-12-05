import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { scrapeWebsiteForProfile } from '../../../scripts/analyze-website'

export const dynamic = 'force-dynamic'

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// System prompt for Navi AI Business Strategist
const NAVI_AI_SYSTEM_PROMPT = `You are the "Navi AI" Lead Local Business Strategist.

Your goal is to analyze a website and generate a "Hyper-Local Business Profile" JSON.

### CRITICAL RULES:

1. **Geography First:** You MUST identify the specific City, County, or Metro Area (e.g., "Hayward, CA", "Bay Area", "Napa Valley").

2. **Hyper-Local Strategy:** Your growth plan MUST use these city names. Do not say "Target Weddings." Say "Target Weddings in [City Name]."

3. **Inference:** If the site lacks data, infer based on the area code (e.g., 415/650 = Bay Area) or address.

### OUTPUT JSON STRUCTURE:

{
  "brand": {
    "name": "String",
    "archetype": "The Local Hero / The Expert / The Ruler (Pick one)",
    "tone": "String",
    "uvp": "String (Focus on their specific local advantage)"
  },
  "local_context": {
    "primary_city": "String (e.g. Hayward)",
    "service_radius": ["List of surrounding cities found"],
    "region": "String (e.g. SF Bay Area)"
  },
  "commercial": {
    "top_3_services": ["Service A", "Service B", "Service C"],
    "pricing_tier": "Budget / Mid / Luxury",
    "friction_score": "Low / High",
    "friction_notes": "String"
  },
  "growth_plan": [
    {
      "step": 1,
      "phase": "Immediate Fix",
      "timeline": "Week 1",
      "action_title": "String (Must be technical/conversion related)",
      "description": "String",
      "impact": "String"
    },
    {
      "step": 2,
      "phase": "Hyper-Local Traffic",
      "timeline": "Month 1",
      "action_title": "Create '[Service] in [Specific City]' Page",
      "description": "Target the specific city/neighborhood keyword gap.",
      "impact": "Capture high-intent local searchers."
    },
    {
      "step": 3,
      "phase": "Scale & Retention",
      "timeline": "Month 2-3",
      "action_title": "String",
      "description": "String",
      "impact": "String"
    }
  ]
}`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required and must be a string' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Step 1: Scrape the website
    let scrapeData
    try {
      scrapeData = await scrapeWebsiteForProfile(url)
    } catch (error: any) {
      console.error('Error scraping website:', error)
      return NextResponse.json(
        { error: `Failed to scrape website: ${error.message}` },
        { status: 500 }
      )
    }

    // Step 2: Convert scrape data to context string for LLM
    const contextString = buildContextString(scrapeData)

    // Step 3: Call OpenAI to generate the business profile
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: NAVI_AI_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: `Analyze this website content and generate the Deep Analytical Business Profile JSON:\n\n${contextString}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      })

      const aiContent = completion.choices[0]?.message?.content

      if (!aiContent) {
        throw new Error('No content returned from OpenAI')
      }

      // Parse and validate JSON
      const profile = JSON.parse(aiContent)

      return NextResponse.json({
        success: true,
        profile,
        scrapeMetadata: {
          url: scrapeData.url,
          statusCode: scrapeData.statusCode,
          pageLoadTime: scrapeData.pageLoadTime,
        },
      })
    } catch (aiError: any) {
      console.error('OpenAI API error:', aiError)
      return NextResponse.json(
        {
          error: 'Failed to generate business profile',
          details: aiError.message,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in /api/generate-profile:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Converts scraped website data into a formatted context string for the LLM
 */
function buildContextString(data: Awaited<ReturnType<typeof scrapeWebsiteForProfile>>): string {
  const parts: string[] = []

  parts.push(`URL: ${data.url}`)
  parts.push(`Status Code: ${data.statusCode}`)
  parts.push(`Page Load Time: ${data.pageLoadTime}ms`)

  if (data.title) {
    parts.push(`\nTitle: ${data.title}`)
  }

  if (data.metaDescription) {
    parts.push(`Meta Description: ${data.metaDescription}`)
  }

  if (data.metaKeywords) {
    parts.push(`Meta Keywords: ${data.metaKeywords}`)
  }

  if (data.h1) {
    parts.push(`\nMain Heading (H1): ${data.h1}`)
  }

  if (data.h2s.length > 0) {
    parts.push(`\nSection Headings (H2):\n${data.h2s.map((h, i) => `  ${i + 1}. ${h}`).join('\n')}`)
  }

  if (data.h3s.length > 0) {
    parts.push(`\nSubsection Headings (H3):\n${data.h3s.slice(0, 10).map((h, i) => `  ${i + 1}. ${h}`).join('\n')}`)
  }

  // Include main text content (truncated if too long)
  const textPreview = data.text.length > 5000 
    ? data.text.substring(0, 5000) + '... [truncated]'
    : data.text
  parts.push(`\nMain Content:\n${textPreview}`)

  // Include key links (internal and external)
  const internalLinks = data.links.filter(link => {
    try {
      const linkUrl = new URL(link)
      const dataUrl = new URL(data.url)
      return linkUrl.hostname === dataUrl.hostname
    } catch {
      return false
    }
  }).slice(0, 20)

  if (internalLinks.length > 0) {
    parts.push(`\nKey Internal Links:\n${internalLinks.map((link, i) => `  ${i + 1}. ${link}`).join('\n')}`)
  }

  // Include image alt texts (for context)
  const imageAlts = data.images
    .filter(img => img.alt)
    .slice(0, 10)
    .map(img => img.alt)
  
  if (imageAlts.length > 0) {
    parts.push(`\nImage Alt Texts (for context):\n${imageAlts.map((alt, i) => `  ${i + 1}. ${alt}`).join('\n')}`)
  }

  parts.push(`\nSEO Health:`)
  parts.push(`  - robots.txt: ${data.hasRobotsTxt ? 'Present' : 'Missing'}`)
  parts.push(`  - sitemap.xml: ${data.hasSitemap ? 'Present' : 'Missing'}`)

  return parts.join('\n')
}

