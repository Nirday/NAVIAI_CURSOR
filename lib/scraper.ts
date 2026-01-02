/**
 * Resilient Website Scraper with Waterfall Fallback
 * 
 * Strategy:
 * 1. Attempt 1: Standard fetch with Chrome-like headers (Fast/Free)
 * 2. Attempt 2: If blocked (403, 429, or WAF detected), use Firecrawl API
 * 3. Attempt 3: If Firecrawl fails, try Jina Reader API
 * 
 * Returns clean Markdown or HTML content for AI processing
 */

export interface ScrapeResult {
  content: string;
  method: 'fetch' | 'firecrawl' | 'jina';
  success: boolean;
}

/**
 * Detects if a response indicates blocking (403, 429, or WAF protection)
 */
function isBlocked(response: Response, bodyText?: string): boolean {
  // Check status codes
  if (response.status === 403 || response.status === 429) {
    return true;
  }

  // Check for WAF/Cloudflare indicators in response text
  if (bodyText) {
    const blockedIndicators = [
      'cloudflare',
      'waf',
      'access denied',
      'blocked',
      'forbidden',
      'rate limit',
      'challenge',
      'checking your browser',
      'ddos protection',
      'security check'
    ];

    const lowerText = bodyText.toLowerCase();
    return blockedIndicators.some(indicator => lowerText.includes(indicator));
  }

  return false;
}

/**
 * Attempt 1: Standard fetch with Chrome-like headers
 */
async function attemptStandardFetch(url: string): Promise<ScrapeResult> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    const bodyText = await response.text();

    // Check if blocked
    if (isBlocked(response, bodyText)) {
      throw new Error(`Blocked by website (Status: ${response.status})`);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return {
      content: bodyText,
      method: 'fetch',
      success: true
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Standard fetch failed: ${message}`);
  }
}

/**
 * Attempt 2: Firecrawl API (requires FIRECRAWL_API_KEY)
 */
async function attemptFirecrawl(url: string): Promise<ScrapeResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY not configured');
  }

  try {
    const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown', 'html'],
        onlyMainContent: true
      }),
      signal: AbortSignal.timeout(30000) // 30 second timeout for API
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Firecrawl returns data in { data: { markdown, html, ... } }
    const content = data.data?.markdown || data.data?.html || data.data?.content || '';
    
    if (!content) {
      throw new Error('Firecrawl returned empty content');
    }

    return {
      content: content,
      method: 'firecrawl',
      success: true
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Firecrawl failed: ${message}`);
  }
}

/**
 * Attempt 3: Jina Reader API (free, no API key required)
 */
async function attemptJinaReader(url: string): Promise<ScrapeResult> {
  try {
    // Jina Reader API endpoint
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
    
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/event-stream, text/event-stream',
        'X-Return-Format': 'markdown' // Request markdown format
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jina Reader API error: ${response.status} - ${errorText}`);
    }

    const content = await response.text();
    
    if (!content || content.length < 100) {
      throw new Error('Jina Reader returned insufficient content');
    }

    return {
      content: content,
      method: 'jina',
      success: true
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Jina Reader failed: ${message}`);
  }
}

/**
 * Main function: Waterfall scraping with automatic fallback
 * 
 * @param url - The website URL to scrape
 * @returns ScrapeResult with content and method used
 */
export async function getSiteContent(url: string): Promise<ScrapeResult> {
  // Normalize URL
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  // Validate URL
  try {
    new URL(normalizedUrl);
  } catch {
    throw new Error('Invalid URL format');
  }

  // Attempt 1: Standard fetch (fast, free)
  try {
    console.log(`[Scraper] Attempting standard fetch for: ${normalizedUrl}`);
    const result = await attemptStandardFetch(normalizedUrl);
    console.log(`[Scraper] ✓ Success with standard fetch`);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[Scraper] ✗ Standard fetch failed: ${message}`);
    console.log(`[Scraper] Falling back to Firecrawl...`);
  }

  // Attempt 2: Firecrawl API (if API key is configured)
  try {
    const result = await attemptFirecrawl(normalizedUrl);
    console.log(`[Scraper] ✓ Success with Firecrawl`);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[Scraper] ✗ Firecrawl failed: ${message}`);
    
    // Only try Jina if Firecrawl failed due to API key (not other errors)
    if (message.includes('not configured')) {
      console.log(`[Scraper] Firecrawl not configured, trying Jina Reader...`);
    } else {
      console.log(`[Scraper] Firecrawl error, trying Jina Reader as last resort...`);
    }
  }

  // Attempt 3: Jina Reader (free fallback)
  try {
    const result = await attemptJinaReader(normalizedUrl);
    console.log(`[Scraper] ✓ Success with Jina Reader`);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Scraper] ✗ All scraping methods failed. Last error: ${message}`);
    throw new Error(`Failed to scrape website after all attempts: ${message}`);
  }
}

