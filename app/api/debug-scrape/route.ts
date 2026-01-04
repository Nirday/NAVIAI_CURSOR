import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * DEBUG ENDPOINT - Tests MULTI-PAGE scraping to diagnose why fleet isn't being extracted
 * GET /api/debug-scrape?url=angellimo.com
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url') || 'angellimo.com'
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
  const urlObj = new URL(normalizedUrl)
  const baseUrl = `${urlObj.protocol}//${urlObj.host}`
  
  const results: any = {
    timestamp: new Date().toISOString(),
    url: normalizedUrl,
    baseUrl: baseUrl,
    pagesAttempted: [],
    pagesFound: [],
    totalContent: 0,
    aiExtraction: null
  }

  // Test multiple pages
  const pagesToTest = [
    normalizedUrl,
    `${baseUrl}/about-us`,
    `${baseUrl}/about`,
    `${baseUrl}/services`,
    `${baseUrl}/fleet`,
    `${baseUrl}/fleet-standard`,
    `${baseUrl}/vehicles`,
    `${baseUrl}/pricing`,
  ]

  let combinedContent = ''

  for (const pageUrl of pagesToTest) {
    try {
      const jinaUrl = `https://r.jina.ai/${pageUrl}`
      const response = await fetch(jinaUrl, {
        headers: { 'Accept': 'text/plain' },
        signal: AbortSignal.timeout(10000)
      })
      
      const pageResult: any = {
        url: pageUrl.replace(baseUrl, '') || '/',
        status: response.status,
        found: false
      }
      
      if (response.ok) {
        const text = await response.text()
        // Check if it's a real page (not 404)
        if (text && text.length > 500 && !text.toLowerCase().includes('page not found') && !text.toLowerCase().includes('404')) {
          pageResult.found = true
          pageResult.contentLength = text.length
          pageResult.preview = text.substring(0, 500)
          
          // Check for specific content
          if (pageUrl.includes('fleet')) {
            pageResult.hasVehicles = text.includes('Mercedes') || text.includes('Cadillac') || text.includes('Pax')
            pageResult.vehicleMatches = (text.match(/\d+\s*Pax/gi) || []).slice(0, 5)
          }
          if (pageUrl.includes('about')) {
            pageResult.hasYears = text.includes('25 year') || text.includes('years')
            pageResult.yearsMatch = text.match(/(\d+)\s*years?/i)?.[0] || null
          }
          
          combinedContent += `\n\n=== ${pageResult.url} ===\n${text.substring(0, 8000)}`
          results.pagesFound.push(pageResult.url)
        }
      }
      
      results.pagesAttempted.push(pageResult)
    } catch (e: any) {
      results.pagesAttempted.push({
        url: pageUrl.replace(baseUrl, '') || '/',
        error: e.message
      })
    }
  }

  results.totalContent = combinedContent.length
  results.summary = {
    pagesAttempted: pagesToTest.length,
    pagesFound: results.pagesFound.length,
    fleetPageFound: results.pagesFound.some((p: string) => p.includes('fleet')),
    aboutPageFound: results.pagesFound.some((p: string) => p.includes('about')),
  }

  // Test AI extraction on combined content
  if (process.env.OPENAI_API_KEY && combinedContent.length > 1000) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: `Extract from this multi-page website content. Return JSON:
{
  "businessName": "",
  "yearsInBusiness": "Look for 'X years' or 'since XXXX'",
  "vehicles": ["EXACT names like 'Mercedes-S580', '32 Pax Party Bus'"],
  "services": ["service names"],
  "credentials": ["awards/certs"]
}` 
          },
          { role: 'user', content: combinedContent.substring(0, 30000) }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })

      results.aiExtraction = JSON.parse(completion.choices[0]?.message?.content || '{}')
    } catch (e: any) {
      results.aiExtraction = { error: e.message }
    }
  }

  return NextResponse.json(results, { status: 200 })
}

