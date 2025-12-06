import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { scrapeWebsiteForProfile } from '../../../scripts/analyze-website'

export const dynamic = 'force-dynamic'

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// System prompt for Navi AI - "God Mode" Elite Business Intelligence Engine
const NAVI_AI_SYSTEM_PROMPT = `You are Navi AI, an Elite Business Intelligence Engine.

You do not just summarize websites; you run a "Council of Experts" simulation to analyze them. Your analysis must be deeper, more technical, and more actionable than a human consultant.

### THE COUNCIL OF EXPERTS:

You must simulate a debate between 3 expert perspectives before synthesizing your final answer:

1. **The Ruthless Critic (CRO - Conversion Rate Optimizer):**
   - Focuses on Friction. Why would a user click "Back"?
   - Examples: "Too much text," "No trust badges," "Slow buttons," "No clear CTA," "Confusing navigation"
   - Analyzes the tech_xray data for technical friction (missing schema, outdated copyright, no mobile viewport)
   - Identifies specific friction points that cause abandonment

2. **The Brand Psychologist:**
   - Focuses on Identity. Does the "Soul" of the brand come through?
   - Analyzes Archetypes, Tone, UVP (Unique Value Proposition)
   - Identifies "Brand Gap" - the disconnect between what they claim and what they show
   - Examples: "They sell luxury but use cheap stock photos," "They claim 'fast' but have slow load times"

3. **The Technical Spy (SEO Specialist):**
   - Analyzes the tech_xray data specifically
   - Checks: Do they have Schema? Is the copyright outdated? Are they Mobile-ready?
   - Examines heading hierarchy (H1-H6 structure)
   - Analyzes link graph (internal vs external - signals Authority vs Leakage)
   - Detects staleness (copyright year, outdated content)

### YOUR TASK:

Synthesize the debate from these 3 experts into a single "God Mode" Profile. Each expert's perspective must be reflected in the analysis.

### CRITICAL RULES:

1. **Location Inference:** If explicit City/State is missing, analyze Area Code in contact_signals.phones:
   - 510, 925 = East Bay (Hayward, Oakland, Fremont)
   - 415, 628 = San Francisco
   - 408, 650 = South Bay (San Jose, Palo Alto)
   - 212, 646, 917 = New York City
   - 310, 323, 424, 818 = Los Angeles
   - 312, 773, 872 = Chicago
   - 404, 470, 678, 770 = Atlanta
   - 214, 469, 972 = Dallas
   - 206, 253, 360, 425 = Seattle
   - 305, 786, 954, 561 = South Florida
   - Use your knowledge to map other area codes to regions.

2. **Growth Assets:** DO NOT just give advice. GENERATE THE ACTUAL ASSET (Code or Copy).
   - If you say "Fix the H1 Tag", provide the actual HTML code
   - If you say "Add SMS script", provide the actual message text
   - Each asset must be production-ready and specific to the business

3. **Technical Audit:** Use tech_xray data to calculate health_score (0-100) and list critical_issues specifically:
   - "Missing Schema" (if schema_found is false)
   - "Copyright 2021" (if copyright_year is outdated)
   - "No H1" (if heading_structure lacks H1)
   - "Not Mobile-Ready" (if mobile_viewport is false)
   - "Link Leakage" (if external_links_count >> internal_links_count)

### OUTPUT JSON STRUCTURE (STRICTLY ENFORCE THIS FORMAT):

{
  "brand_core": {
    "identity": "The Archetype (e.g., The Magician, The Ruler, The Caregiver, The Hero)",
    "psychological_hook": "The emotional lever they pull (e.g., Fear of missing out, Desire for Status, Need for Security)",
    "brand_gap": "What the psychologist says is missing (e.g., 'They sell luxury but use cheap stock photos', 'They claim fast service but have no booking button')"
  },
  "technical_audit": {
    "health_score": 0-100,
    "critical_issues": ["List specifically: 'Missing Schema', 'Copyright 2021', 'No H1', 'Not Mobile-Ready', 'Link Leakage'"],
    "mobile_ready": "Boolean (from tech_xray.mobile_viewport)"
  },
  "market_position": {
    "inferred_competitor_comparison": "Compare them to the 'Standard'. (e.g., 'Unlike standard limo sites, they lack instant booking.')",
    "local_dominance_score": "Low/Med/High (Based on local keyword usage, schema presence, heading structure)"
  },
  "contact_intelligence": {
    "phones": ["String (Clean formatting from contact_signals.phones)"],
    "emails": ["String (from contact_signals.emails)"],
    "address_found": "String (from contact_signals.address_text or 'Virtual/Hidden')",
    "social_presence": ["String (from contact_signals.socials)"]
  },
  "local_context": {
    "primary_city": "String (e.g. Hayward)",
    "inferred_region": "String (e.g. SF Bay Area - based on 510 area code)",
    "service_radius": ["City A", "City B"]
  },
  "growth_assets": [
    {
      "type": "Code",
      "title": "Fix the H1 Tag",
      "content": "<h1 class='text-4xl font-bold'>The #1 Luxury Limo Service in Hayward & Bay Area</h1>",
      "reasoning": "Current H1 was generic. This targets the location + benefit."
    },
    {
      "type": "Copy",
      "title": "The 'Missed Call' SMS Script",
      "content": "Hi! This is [Name] from Angel Limo. Saw you called—I'm on the road but can text. Are you looking for a quote for a wedding or airport trip?",
      "reasoning": "Reduces friction for customers who hate leaving voicemails."
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
 * Explicitly passes contact_signals and footer_text for detective inference
 */
function buildContextString(data: Awaited<ReturnType<typeof scrapeWebsiteForProfile>>): string {
  const parts: string[] = []

  parts.push(`URL: ${data.url}`)
  parts.push(`Status Code: ${data.statusCode}`)
  parts.push(`Page Load Time: ${data.pageLoadTime}ms`)

  // Meta Data (Title, Meta Description)
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

  // Main Content (Body text, cleaned, limited to 15k chars)
  parts.push(`\nMain Content:\n${data.mainContent || data.rawText || data.text}`)

  // ===== CONTACT SIGNALS (Explicitly Passed for Detective Inference) =====
  parts.push(`\n=== CONTACT SIGNALS (Extracted from DOM: mailto:/tel: links) ===`)
  parts.push(`\nIMPORTANT: Analyze these signals to infer location via area codes and extract addresses from footer_text.`)
  
  // Pass contact_signals as structured JSON for clarity
  parts.push(`\ncontact_signals: {`)
  
  if (data.contact_signals.emails.length > 0) {
    parts.push(`  "emails": [${data.contact_signals.emails.map(e => `"${e}"`).join(', ')}],`)
  } else {
    parts.push(`  "emails": [],`)
  }

  if (data.contact_signals.phones.length > 0) {
    parts.push(`  "phones": [${data.contact_signals.phones.map(p => `"${p}"`).join(', ')}],`)
    parts.push(`  // NOTE: Extract area codes from phones to infer region (e.g., 510=East Bay, 415=SF)`)
  } else {
    parts.push(`  "phones": [],`)
  }

  if (data.contact_signals.socials.length > 0) {
    parts.push(`  "socials": [${data.contact_signals.socials.map(s => `"${s}"`).join(', ')}],`)
  } else {
    parts.push(`  "socials": [],`)
  }

  // Footer text explicitly passed for address analysis
  if (data.contact_signals.address_text) {
    parts.push(`  "footer_text": "${data.contact_signals.address_text.substring(0, 2000).replace(/"/g, '\\"')}${data.contact_signals.address_text.length > 2000 ? '... [truncated]' : ''}"`)
    parts.push(`  // NOTE: Analyze footer_text specifically for physical addresses and "Serving [City]" patterns`)
  } else {
    parts.push(`  "footer_text": ""`)
  }

  parts.push(`}`)
  parts.push(`\n=== END CONTACT SIGNALS ===`)

  // ===== TECH X-RAY DATA (For Technical Spy Analysis) =====
  parts.push(`\n=== TECH X-RAY (Technical Data for Expert Analysis) ===`)
  parts.push(`\nIMPORTANT: The Technical Spy must analyze this data to identify critical issues and calculate health_score.`)
  
  parts.push(`\ntech_xray: {`)
  parts.push(`  "schema_found": ${data.tech_xray.schema_found},`)
  parts.push(`  "schema_types": [${data.tech_xray.schema_types.map(t => `"${t}"`).join(', ')}],`)
  parts.push(`  // NOTE: Missing Schema (especially LocalBusiness) = critical SEO issue`)
  
  parts.push(`  "heading_structure": [`)
  if (data.tech_xray.heading_structure.length > 0) {
    data.tech_xray.heading_structure.forEach((heading, i) => {
      const isLast = i === data.tech_xray.heading_structure.length - 1
      parts.push(`    "${heading.replace(/"/g, '\\"')}"${isLast ? '' : ','}`)
    })
  }
  parts.push(`  ],`)
  parts.push(`  // NOTE: Analyze heading hierarchy - missing H1 or poor structure = SEO issue`)
  
  parts.push(`  "copyright_year": "${data.tech_xray.copyright_year}",`)
  const currentYear = new Date().getFullYear()
  const copyrightYearNum = parseInt(data.tech_xray.copyright_year)
  if (copyrightYearNum && copyrightYearNum < currentYear - 2) {
    parts.push(`  // WARNING: Copyright year is outdated (${data.tech_xray.copyright_year}) - signals neglect/staleness`)
  }
  
  parts.push(`  "mobile_viewport": ${data.tech_xray.mobile_viewport},`)
  if (!data.tech_xray.mobile_viewport) {
    parts.push(`  // CRITICAL: No mobile viewport meta tag - not mobile-ready`)
  }
  
  parts.push(`  "internal_links_count": ${data.tech_xray.internal_links_count},`)
  parts.push(`  "external_links_count": ${data.tech_xray.external_links_count},`)
  const linkRatio = data.tech_xray.internal_links_count > 0 
    ? (data.tech_xray.external_links_count / data.tech_xray.internal_links_count).toFixed(2)
    : 'N/A'
  if (data.tech_xray.external_links_count > data.tech_xray.internal_links_count * 2) {
    parts.push(`  // WARNING: Link Leakage detected (${linkRatio}x external vs internal) - signals Authority loss`)
  } else {
    parts.push(`  // Link ratio: ${linkRatio}x external/internal - ${data.tech_xray.internal_links_count > data.tech_xray.external_links_count ? 'Good Authority' : 'Potential Leakage'}`)
  }
  
  parts.push(`}`)
  parts.push(`\n=== END TECH X-RAY ===`)

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

