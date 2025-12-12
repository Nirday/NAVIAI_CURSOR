import * as cheerio from 'cheerio';

export interface ScrapedData {
  url: string;
  // Send "Zones" so AI understands structure
  zones: {
    navigation_html: string; // The full <nav> HTML (For Services)
    footer_html: string;     // The full <footer> HTML (For Address)
    hero_text: string;       // First 1000 chars of body (For UVP)
    button_labels: string[]; // "Book Now" vs "Request Quote" (For Friction)
  };
  meta: {
    title: string;
    description: string;
  };
  // Raw Regex Hunt (No cleaning)
  raw_contacts: {
    emails: string[];
    phones: string[];
  };
}

export async function performBasicSEOAnalysis(url: string): Promise<ScrapedData> {
  // Use Real Browser User-Agent to avoid blocks
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  // 1. ZONE EXTRACTION
  const navigation_html = $('nav, header').first().html() || '';
  const footer_html = $('footer, .footer').first().html() || '';

  // 2. SIGNAL EXTRACTION
  const button_labels = $('a, button')
    .filter((i, el) => {
      const t = $(el).text().toLowerCase();
      return t.includes('book') || t.includes('schedule') || t.includes('quote') || t.includes('contact');
    })
    .map((i, el) => $(el).text().trim())
    .get();

  // 3. REGEX HUNT (On full HTML to catch hidden data)
  const phones = html.match(/(?:\+?1[-.]?)?\(?([2-9][0-8][0-9])\)?[-. ]?([2-9][0-9]{2})[-. ]?([0-9]{4})/g) || [];
  const emails = html.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g) || [];

  return {
    url,
    zones: {
      navigation_html: navigation_html.substring(0, 8000), // Limit for token budget
      footer_html: footer_html.substring(0, 5000),
      hero_text: $('body').text().substring(0, 1000).replace(/\s+/g, ' '),
      button_labels: [...new Set(button_labels)]
    },
    meta: {
      title: $('title').text(),
      description: $('meta[name="description"]').attr('content') || ''
    },
    raw_contacts: {
      emails: [...new Set(emails)],
      phones: [...new Set(phones)]
    }
  };
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
  structure: {
    nav_links: string[];
    cta_buttons: string[];
    trust_signals: string[];
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

  // Derive additional signals for backward compatibility consumers
  const domain = new URL(url).hostname.replace('www.', '');
  const bodyText = $('body').text().replace(/\s+/g, ' ').substring(0, 15000);
  const footerTextRaw = scraped.zones.footer_html || $('footer').first().html() || '';
  const footer$ = cheerio.load(footerTextRaw);
  const footerText =
    footer$.root().text().replace(/\s+/g, ' ').trim() ||
    $('footer').text().replace(/\s+/g, ' ').trim();

  let cms: string | null = null;
  if (html.includes('wp-content')) cms = 'WordPress';
  else if (html.includes('wix.com')) cms = 'Wix';
  else if (html.includes('shopify.com')) cms = 'Shopify';
  else if (html.includes('squarespace')) cms = 'Squarespace';

  const social_graph = $('a')
    .map((i, el) => $(el).attr('href'))
    .get()
    .filter(
      (h) =>
        h &&
        (h.includes('facebook.com') ||
          h.includes('instagram.com') ||
          h.includes('linkedin.com') ||
          h.includes('twitter.com') ||
          h.includes('x.com')),
    );

  const nav_links = $('nav a, header a, .menu a, .navigation a, [role="navigation"] a')
    .map((i, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > 3 && t.length < 30)
    .slice(0, 15);

  const cta_buttons = $('button, a.btn, a.button, input[type="submit"], [class*="cta"], [class*="button"]')
    .map((i, el) => {
      const text = $(el).text().trim();
      const value = $(el).attr('value');
      return text || value || '';
    })
    .get()
    .filter((t) => t.length > 0 && t.length < 50);

  const trust_signals = $('img')
    .map((i, el) => $(el).attr('alt'))
    .get()
    .filter(
      (alt) =>
        alt &&
        (alt.toLowerCase().includes('award') ||
          alt.toLowerCase().includes('certified') ||
          alt.toLowerCase().includes('review') ||
          alt.toLowerCase().includes('partner') ||
          alt.toLowerCase().includes('approved') ||
          alt.toLowerCase().includes('accredited') ||
          alt.toLowerCase().includes('badge') ||
          alt.toLowerCase().includes('logo')),
    );
  
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
    text: bodyText,
    title: scraped.meta.title || domain || null,
    metaDescription: scraped.meta.description || null,
    metaKeywords: $('meta[name="keywords"]').attr('content') || null,
    h1: $('h1').first().text().trim() || scraped.meta.title || domain || null,
    h2s,
    h3s,
    links,
    images,
    statusCode,
    pageLoadTime,
    hasRobotsTxt,
    hasSitemap,
    rawText: bodyText,
    mainContent: bodyText,
    contact_signals: {
      emails: scraped.raw_contacts.emails,
      phones: scraped.raw_contacts.phones,
      socials: [...new Set(social_graph)],
      address_text: footerText
    },
    tech_xray: {
      schema_found: !!$('script[type="application/ld+json"]').length,
      schema_types: schemaTypes,
      heading_structure: headingStructure,
      copyright_year: copyrightYear,
      mobile_viewport: !!$('meta[name="viewport"]').length,
      internal_links_count: internalLinksCount,
      external_links_count: externalLinksCount,
      cms
    },
    structure: {
      nav_links: [...new Set(nav_links)],
      cta_buttons: [...new Set(cta_buttons)],
      trust_signals: [...new Set(trust_signals)]
    }
  };
}
