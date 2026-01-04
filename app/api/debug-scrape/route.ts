import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * DEBUG ENDPOINT - Tests the full scraping pipeline and returns detailed diagnostics
 * GET /api/debug-scrape?url=angellimo.com
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url') || 'angellimo.com'
  const results: any = {
    timestamp: new Date().toISOString(),
    url: url,
    steps: {}
  }

  // Step 1: Check Environment Variables
  results.steps.envCheck = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? `Present (${process.env.OPENAI_API_KEY.substring(0, 7)}...${process.env.OPENAI_API_KEY.slice(-4)})` : 'MISSING!',
    NODE_ENV: process.env.NODE_ENV
  }

  // Step 2: Test Jina Scraping
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
    const jinaUrl = `https://r.jina.ai/${normalizedUrl}`
    
    const jinaResponse = await fetch(jinaUrl, {
      headers: { 'Accept': 'text/plain' },
      signal: AbortSignal.timeout(30000)
    })

    if (jinaResponse.ok) {
      const content = await jinaResponse.text()
      results.steps.jinaScrape = {
        status: 'SUCCESS',
        contentLength: content.length,
        preview: content.substring(0, 1500)
      }
      
      // Step 3: Test OpenAI Extraction (only if scraping worked)
      if (process.env.OPENAI_API_KEY) {
        try {
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
          
          const SIMPLE_PROMPT = `You are extracting business information from a website. Return a FLAT JSON object with these exact keys:

{
  "businessName": "The company name",
  "tagline": "Their slogan if any",
  "industry": "e.g. Limousine Service, Chiropractic, Restaurant",
  "phone": "Phone number found",
  "email": "Email found", 
  "city": "City name",
  "state": "State abbreviation",
  "address": "Street address if found",
  "services": ["Service 1", "Service 2", "Service 3"],
  "fleet": ["Vehicle type 1", "Vehicle type 2"],
  "credentials": ["Certification 1", "Award 1"],
  "hasOnlineBooking": true or false,
  "hasBlog": true or false,
  "bookingFriction": "Low/Medium/High",
  "websiteQuality": "Modern/Professional or Dated or Basic",
  "killShot": "Their most impressive differentiator"
}

Extract EVERYTHING you can find. If a field is not found, use empty string "" or empty array [].
DO NOT nest objects. Keep it flat.`

          const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: SIMPLE_PROMPT },
              { role: 'user', content: `Extract business info from this website:\n\nURL: ${normalizedUrl}\n\nCONTENT:\n${content.substring(0, 15000)}` }
            ],
            temperature: 0.1,
            max_tokens: 2000,
            response_format: { type: 'json_object' }
          })

          const rawResponse = completion.choices[0]?.message?.content || '{}'
          
          results.steps.openaiExtraction = {
            status: 'SUCCESS',
            model: 'gpt-4o',
            rawResponse: rawResponse,
            parsed: JSON.parse(rawResponse)
          }
        } catch (aiError: any) {
          results.steps.openaiExtraction = {
            status: 'FAILED',
            error: aiError.message,
            code: aiError.code,
            type: aiError.type
          }
        }
      } else {
        results.steps.openaiExtraction = {
          status: 'SKIPPED',
          reason: 'OPENAI_API_KEY not set'
        }
      }
    } else {
      results.steps.jinaScrape = {
        status: 'FAILED',
        httpStatus: jinaResponse.status
      }
    }
  } catch (scrapeError: any) {
    results.steps.jinaScrape = {
      status: 'ERROR',
      error: scrapeError.message
    }
  }

  return NextResponse.json(results, { status: 200 })
}

