import * as cheerio from 'cheerio';

export interface ScrapedData {
  url: string;
  title: string;
  metaDescription: string;
  h1: string;
  body_content: string;
  footer_text: string;
  technical: {
    cms: string | null; // 'WordPress', 'Squarespace', etc.
    has_schema: boolean; // For Task 17.4
    mobile_viewport: boolean;
  };
  social_graph: string[]; // For Task 17.5 - Facebook/Instagram/LinkedIn/Twitter links
  contacts: {
    phones: string[];
    emails: string[];
  };
}

export async function performBasicSEOAnalysis(url: string): Promise<ScrapedData> {
  console.log(`🔍 X-Ray Scanning: ${url}`);
  
  try {
    // 1. ANTI-BLOCKING HEADERS (Crucial Fix)
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      redirect: 'follow'
    });
    
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);

    // 2. Tech Stack Detection
    let cms = null;
    if (html.includes('wp-content')) cms = 'WordPress';
    else if (html.includes('wix.com')) cms = 'Wix';
    else if (html.includes('shopify.com')) cms = 'Shopify';
    else if (html.includes('squarespace')) cms = 'Squarespace';

    // 3. Regex Extraction (The "X-Ray")
    const extract = (regex: RegExp) => [...new Set((html.match(regex) || []))];
    // Improved Phone Regex to catch (555) 555-5555 and 555.555.5555
    const phones = extract(/(?:\+?1[-.]?)?\(?([2-9][0-8][0-9])\)?[-. ]?([2-9][0-9]{2})[-. ]?([0-9]{4})/g);
    const emails = extract(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g);

    // 4. Social Graph (For Task 17.5)
    const social_graph = $('a').map((i, el) => $(el).attr('href')).get()
      .filter(h => h && (h.includes('facebook.com') || h.includes('instagram.com') || h.includes('linkedin.com') || h.includes('twitter.com') || h.includes('x.com')));

    // 5. Fallback Data (If site blocks title)
    const domain = new URL(url).hostname.replace('www.', '');
    const title = $('title').text().trim() || domain;

    return {
      url,
      title,
      metaDescription: $('meta[name="description"]').attr('content') || '',
      h1: $('h1').first().text().trim() || title, // Fallback to title if H1 missing
      body_content: $('body').text().replace(/\s+/g, ' ').substring(0, 15000),
      footer_text: $('footer').text().replace(/\s+/g, ' ').trim(),
      technical: {
        cms,
        has_schema: !!$('script[type="application/ld+json"]').length,
        mobile_viewport: !!$('meta[name="viewport"]').length
      },
      social_graph: [...new Set(social_graph)],
      contacts: { 
        phones: [...new Set(phones)], 
        emails: [...new Set(emails)] 
      }
    };
  } catch (error) {
    console.error('X-Ray Failed:', error);
    throw error;
  }
}

// Compatibility interface for existing API routes
export interface WebsiteScrapeData {
  url: string;
  html: string;
  text: string;
  title: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  h1: string | null;
  h2s: string[];
  h3s: string[];
  links: string[];
  images: Array<{ src: string; alt: string | null }>;
  statusCode: number;
  pageLoadTime: number;
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
  rawText: string;
  mainContent: string;
  contact_signals: {
    emails: string[];
    phones: string[];
    socials: string[];
    address_text: string;
  };
  tech_xray: {
    schema_found: boolean;
    schema_types: string[];
    heading_structure: string[];
    copyright_year: string;
    mobile_viewport: boolean;
    internal_links_count: number;
    external_links_count: number;
    cms: string | null;
  };
}

/**
 * Compatibility function that wraps the new scraper and returns data in the old format
 * This maintains backward compatibility with existing API routes
 */
export async function scrapeWebsiteForProfile(url: string): Promise<WebsiteScrapeData> {
  const startTime = Date.now();
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    signal: AbortSignal.timeout(30000)
  });
  
  const pageLoadTime = Date.now() - startTime;
  const statusCode = response.status;
  
  if (!response.ok) {
    throw new Error(`HTTP ${statusCode}: ${response.statusText}`);
  }
  
  const html = await response.text();
  const $ = cheerio.load(html);
  
  // Use the new scraper logic
  const scraped = await performBasicSEOAnalysis(url);
  
  // Extract additional data needed for compatibility
  const h2s: string[] = [];
  $('h2').each((_, el) => {
    const text = $(el).text().trim();
    if (text) h2s.push(text);
  });
  
  const h3s: string[] = [];
  $('h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text) h3s.push(text);
  });
  
  const links: string[] = [];
  let internalLinksCount = 0;
  let externalLinksCount = 0;
  const urlObj = new URL(url);
  const baseHostname = urlObj.hostname;
  
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      try {
        const absoluteUrl = new URL(href, url).href;
        links.push(absoluteUrl);
        const linkUrl = new URL(absoluteUrl);
        if (linkUrl.hostname === baseHostname || linkUrl.hostname === '') {
          internalLinksCount++;
        } else {
          externalLinksCount++;
        }
      } catch {
        // Skip invalid URLs
      }
    }
  });
  
  const images: Array<{ src: string; alt: string | null }> = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    const alt = $(el).attr('alt') || null;
    if (src) {
      try {
        const absoluteUrl = new URL(src, url).href;
        images.push({ src: absoluteUrl, alt });
      } catch {
        // Skip invalid URLs
      }
    }
  });
  
  // Extract heading structure
  const headingStructure: string[] = [];
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const $el = $(el);
    const tag = $el.prop('tagName')?.toLowerCase() || 'unknown';
    const text = $el.text().trim();
    if (text) {
      headingStructure.push(`${tag}: ${text}`);
    }
  });
  
  // Extract copyright year from footer
  const footerText = scraped.footer_text;
  const copyrightMatch = footerText.match(/20[0-9]{2}/);
  const copyrightYear = copyrightMatch ? copyrightMatch[0] : 'Unknown';
  
  // Extract schema types
  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const schemaText = $(el).html();
      if (schemaText) {
        const parsed = JSON.parse(schemaText);
        const schemaType = parsed['@type'] || 'Unknown';
        if (schemaType) schemaTypes.push(schemaType);
      }
    } catch {
      // Skip invalid JSON
    }
  });
  
  // Check robots.txt and sitemap.xml
  const base = `${urlObj.protocol}//${urlObj.host}`;
  
  let hasRobotsTxt = false;
  try {
    const robotsResponse = await fetch(`${base}/robots.txt`, {
      signal: AbortSignal.timeout(5000)
    });
    hasRobotsTxt = robotsResponse.ok && robotsResponse.status !== 404;
  } catch {
    hasRobotsTxt = false;
  }
  
  let hasSitemap = false;
  try {
    const sitemapResponse = await fetch(`${base}/sitemap.xml`, {
      signal: AbortSignal.timeout(5000)
    });
    hasSitemap = sitemapResponse.ok && sitemapResponse.status !== 404;
  } catch {
    hasSitemap = false;
  }
  
  // Map to old format
  return {
    url: scraped.url,
    html,
    text: scraped.body_content,
    title: scraped.title || null,
    metaDescription: scraped.metaDescription || null,
    metaKeywords: $('meta[name="keywords"]').attr('content') || null,
    h1: scraped.h1 || null,
    h2s,
    h3s,
    links,
    images,
    statusCode,
    pageLoadTime,
    hasRobotsTxt,
    hasSitemap,
    rawText: scraped.body_content,
    mainContent: scraped.body_content,
    contact_signals: {
      emails: scraped.contacts.emails,
      phones: scraped.contacts.phones,
      socials: scraped.social_graph, // Use social_graph from new structure
      address_text: scraped.footer_text
    },
    tech_xray: {
      schema_found: scraped.technical.has_schema,
      schema_types: schemaTypes,
      heading_structure: headingStructure,
      copyright_year: copyrightYear,
      mobile_viewport: scraped.technical.mobile_viewport,
      internal_links_count: internalLinksCount,
      external_links_count: externalLinksCount,
      cms: scraped.technical.cms
    }
  };
}
