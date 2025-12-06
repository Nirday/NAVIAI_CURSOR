import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { scrapeWebsiteForProfile } from '../../../scripts/analyze-website'

export const dynamic = 'force-dynamic'

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SYSTEM_PROMPT = `
You are the Brain of Navi AI (SMB Operating System).

Your goal is to analyze the business and output a JSON object that initializes 4 core modules:

1. **Dossier (Markdown):** A comprehensive report for the user.
2. **Website Config (Task 17.2):** Headlines, colors, and UVP.
3. **Blog Config (Task 17.3):** Content pillars and keywords.
4. **Growth Actions:** A prioritized roadmap.

### CRITICAL RULES:

1. **Inference:** If address is missing, use the Phone Area Code to infer the "Service Region".
2. **Archetype:** Strictly map tone to: [The Ruler, The Caregiver, The Hero, The Jester, The Everyman].
3. **Formatting:** The \`markdown_report\` must be rich with headers (#) and bullet points.

### ARCHETYPE LOGIC MAP (Do NOT Guess):

- **"Luxury", "Executive", "Exclusive", "Elite"** -> Archetype: **The Ruler**
- **"Family", "Care", "Health", "Gentle", "Safe"** -> Archetype: **The Caregiver**
- **"Fast", "Fix", "Repair", "Emergency", "Save"** -> Archetype: **The Hero**
- **"Fun", "Party", "Adventure", "Experience"** -> Archetype: **The Jester**
- **"Affordable", "Local", "Community", "Simple"** -> Archetype: **The Everyman**

### LOCATION INFERENCE RULES:

1. **Check Footer:** Look at 'footer_text' for City/State/Zip.
2. **Check Phones:** Use Area Codes in 'contacts.phones' (e.g., 510=East Bay, 415=SF, 305=Miami).
3. **Check H1/Title:** Look for "City Name" in the title tag.

*Result:* You MUST output a specific "Primary City" and "Service Region". Do not say "Unknown".

### OUTPUT JSON STRUCTURE:

{
  "module_config": {
    "brand": {
      "name": "String",
      "archetype": "String (The Ruler | The Caregiver | The Hero | The Jester | The Everyman)",
      "colors": ["Primary Hex", "Secondary Hex"]
    },
    "website_builder": {
      "hero_headline": "String (High converting hook)",
      "subheadline": "String",
      "services_list": ["Service A", "Service B", "Service C"]
    },
    "blog_engine": {
      "content_pillars": ["Topic 1", "Topic 2", "Topic 3"],
      "local_keywords": ["Service + City 1", "Service + City 2"]
    },
    "crm_data": {
      "email": "String",
      "phone": "String",
      "address": "String (Full address or 'Virtual')"
    }
  },
  "markdown_report": "# 📊 Deep Analytical Dossier: [Business Name]\\n\\n## 1. 🆔 Brand Identity & Core\\n\\n* **Archetype:** [Value]\\n* **Tone:** [Value]\\n* **UVP:** [Value]\\n\\n## 2. 📍 Local Intelligence\\n\\n* **Primary City:** [City]\\n* **Service Radius:** [Region inferred from Area Code/Footer]\\n* **Contact Data:** [Phone] | [Email]\\n\\n## 3. 🛠 Technical Health (X-Ray)\\n\\n* **Platform:** [CMS or 'Custom']\\n* **Mobile Ready:** [Yes/No]\\n* **Schema Markup:** [Detected/Missing]\\n\\n## 4. 🚀 The Execution Roadmap\\n\\n### Phase 1: Foundation (Week 1)\\n\\n* **Action:** [Specific Fix]\\n* **Why:** [Impact]\\n\\n### Phase 2: Traffic (Month 1)\\n\\n* **Action:** [Content Strategy]\\n* **Why:** [SEO Impact]\\n\\n---\\n*Analysis by Navi AI*"
}

### COLOR INFERENCE:

If colors are not explicitly found, infer from:
- Brand archetype (Ruler = dark/royal, Caregiver = soft/warm, Hero = bold/energetic)
- Industry standards (healthcare = blue/green, legal = navy/blue, etc.)
- Default to professional palette if uncertain: ["#1E40AF", "#3B82F6"] (blue tones)

### CRITICAL: 
- The \`markdown_report\` must be a properly escaped JSON string (use \\n for newlines)
- All arrays must have at least 1 item
- All strings must be non-empty or use "Virtual" / "Unknown" only when truly unavailable
`

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
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: `Analyze this website content and generate the Deep Analytical Business Profile (Master Dossier) as a JSON object with 'module_config' and 'markdown_report' fields:\n\n${contextString}`,
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
      const profileResponse = JSON.parse(aiContent)
      
      // Extract module_config (the new "Operating System" structure)
      const moduleConfig = profileResponse.module_config || {}
      
      // Extract markdown_report from the new structure
      const markdownReport = profileResponse.markdown_report || profileResponse.content || aiContent
      
      // Extract structured_data for backward compatibility (if present)
      const structuredData = profileResponse.structured_data || {}

      // Build backward-compatible profile object
      const profile = {
        ...profileResponse,
        module_config: moduleConfig, // New structure
        structured_data: structuredData, // Legacy structure
        content: markdownReport, // Keep for backward compatibility
      }

      return NextResponse.json({
        success: true,
        profile,
        module_config: moduleConfig, // Primary new field for downstream modules
        profile_report: markdownReport, // Primary field for frontend display
        markdown_report: markdownReport, // Explicit field name
        structured_data: structuredData, // Legacy support
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
  parts.push(`\n=== CONTACTS (Extracted from DOM: mailto:/tel: links and HTML regex) ===`)
  parts.push(`\nIMPORTANT: Use these signals to infer location via area codes and extract addresses from footer_text.`)
  
  // Pass contacts as structured JSON for clarity (matching new SYSTEM_PROMPT format)
  parts.push(`\ncontacts: {`)
  
  if (data.contact_signals.emails.length > 0) {
    parts.push(`  "emails": [${data.contact_signals.emails.map(e => `"${e}"`).join(', ')}],`)
  } else {
    parts.push(`  "emails": [],`)
  }

  if (data.contact_signals.phones.length > 0) {
    parts.push(`  "phones": [${data.contact_signals.phones.map(p => `"${p}"`).join(', ')}],`)
    parts.push(`  // CRITICAL: Extract area codes from phones to infer service_region (e.g., 510=East Bay, 415=SF, 305=Miami)`)
    parts.push(`  // If no city is mentioned in text, use area code mapping to set local_intelligence.service_region`)
  } else {
    parts.push(`  "phones": [],`)
  }

  if (data.contact_signals.socials.length > 0) {
    parts.push(`  "socials": [${data.contact_signals.socials.map(s => `"${s}"`).join(', ')}],`)
  } else {
    parts.push(`  "socials": [],`)
  }

  parts.push(`}`)
  
  // Footer text explicitly passed for address analysis
  const footerText = data.contact_signals.address_text || ''
  if (footerText) {
    parts.push(`\nfooter_text: "${footerText.substring(0, 2000).replace(/"/g, '\\"')}${footerText.length > 2000 ? '... [truncated]' : ''}"`)
    parts.push(`// CRITICAL: Analyze footer_text for physical addresses and "Serving [City]" patterns`)
    parts.push(`// Use this to set local_intelligence.primary_city and geo_inference_source`)
  } else {
    parts.push(`\nfooter_text: ""`)
  }
  
  parts.push(`\n=== END CONTACTS ===`)

  // ===== TECHNICAL SIGNALS (For Tech Stack and Health Score) =====
  parts.push(`\n=== TECHNICAL (For Tech Stack and Health Score Calculation) ===`)
  parts.push(`\nIMPORTANT: Use these signals to populate tech_stack and calculate health_score (0-100).`)
  
  parts.push(`\ntechnical: {`)
  parts.push(`  "cms": ${data.tech_xray.cms ? `"${data.tech_xray.cms}"` : 'null'},`)
  parts.push(`  "has_schema": ${data.tech_xray.schema_found},`)
  parts.push(`  "mobile_viewport": ${data.tech_xray.mobile_viewport}`)
  parts.push(`}`)
  parts.push(`\n=== END TECHNICAL ===`)
  
  // Additional context for heading structure
  if (data.tech_xray.heading_structure.length > 0) {
    parts.push(`\nHeading Structure (for context):`)
    data.tech_xray.heading_structure.slice(0, 10).forEach((heading, i) => {
      parts.push(`  ${i + 1}. ${heading}`)
    })
  }

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

