import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { scrapeWebsiteForProfile } from '../../../scripts/analyze-website'

export const dynamic = 'force-dynamic'

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// System prompt for Navi AI Business Strategist
const NAVI_AI_SYSTEM_PROMPT = `You are the "Navi AI" Lead Business Strategist. 
Your goal is to analyze raw website content and generate a structured "Deep Analytical Business Profile" JSON object.

### INSTRUCTIONS:

1.  **Analyze** the provided website text deeply.

2.  **Infer** missing data (e.g., if no price is shown, infer "High" or "Call-to-Quote" based on visual cues/tone).

3.  **Construct** a strategic growth plan with 3 distinct execution steps.

4.  **Output** strictly valid JSON.

### OUTPUT JSON STRUCTURE:

{
  "brand": {
    "name": "Business Name",
    "archetype": "The Hero / The Sage / The Caregiver / The Ruler (Pick one & explain why)",
    "tone": "List 3 adjectives (e.g., Professional, Warm, Urgent)",
    "uvp": "The one specific promise they make (Unique Value Proposition)",
    "target_audience": "Specific demographic inference (e.g., 'Affluent Homeowners in [City]')"
  },
  "commercial": {
    "primary_services": ["Service A", "Service B", "Service C"],
    "pricing_tier": "Budget / Mid-Range / Luxury",
    "transactional_friction": "Low / Medium / High",
    "friction_notes": "Why is friction high? (e.g., 'No booking button, phone only')"
  },
  "seo_content": {
    "local_focus": "City or Neighborhoods detected",
    "sentiment_analysis": "Summary of reviews/trust signals",
    "keyword_gaps": ["Keyword 1 they miss", "Keyword 2 they miss"]
  },
  "growth_plan": [
    {
      "step": 1,
      "phase": "Immediate Fix",
      "timeline": "Week 1",
      "action_title": "Title of the technical/conversion fix",
      "description": "Specific instruction (e.g., 'Add a Book Now button to header').",
      "expected_impact": "Why this matters (e.g., 'Increase conversion by 20%')"
    },
    {
      "step": 2,
      "phase": "Traffic Expansion",
      "timeline": "Month 1",
      "action_title": "Title of content strategy",
      "description": "Specific content idea (e.g., 'Create landing page for [Service] in [City]').",
      "expected_impact": "Capture [Specific Keyword] traffic"
    },
    {
      "step": 3,
      "phase": "Scale & Retention",
      "timeline": "Month 2-3",
      "action_title": "Title of automation/ad strategy",
      "description": "Specific campaign idea (e.g., 'Run SMS blast for seasonal offer').",
      "expected_impact": "Increase Lifetime Value (LTV)"
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
        model: 'gpt-4-turbo-preview',
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

