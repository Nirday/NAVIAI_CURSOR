/**
 * Core Website Crawler & Analyzer
 * Crawls main pages and checks for SEO health issues
 */

import * as cheerio from 'cheerio'
import { SeoIssue, SeoIssueType, SeoIssueSeverity } from './types'
import { Website } from '../../website-builder/src/types'
import { getPublishedWebsiteByDomain } from '../../website-builder/src/data'

/**
 * Runs a website audit by crawling main pages and checking SEO factors
 * 
 * @param websiteUrl - The base URL of the website to audit
 * @param userId - The user ID (to fetch website structure)
 * @returns Promise resolving to array of SEO issues found
 */
export async function runWebsiteAudit(
  websiteUrl: string,
  userId: string
): Promise<SeoIssue[]> {
  const issues: SeoIssue[] = []
  
  try {
    // Normalize URL (ensure it has protocol)
    const baseUrl = normalizeUrl(websiteUrl)
    const urlObj = new URL(baseUrl)
    
    // Get website structure to find navigation links
    const website = await getWebsiteByUserIdOrDomain(userId, urlObj.hostname)
    
    // Get pages to crawl from navigation (homepage + other pages)
    const pagesToCrawl = getPagesToCrawl(baseUrl, website)
    
    // Check robots.txt and sitemap.xml (site-wide)
    const siteWideIssues = await checkSiteWideFiles(baseUrl, userId, 'temp-audit-id')
    issues.push(...siteWideIssues)
    
    // Crawl each page
    const pageData: Array<{ url: string; title?: string; metaDesc?: string; h1?: string }> = []
    
    for (const pageUrl of pagesToCrawl) {
      try {
        const pageIssues = await crawlAndAnalyzePage(pageUrl, userId, 'temp-audit-id')
        issues.push(...pageIssues)
        
        // Collect page data for duplicate detection
        const pageInfo = await extractPageData(pageUrl)
        pageData.push({ url: pageUrl, ...pageInfo })
      } catch (error: any) {
        // Create issue for unreachable page
        issues.push({
          id: 'temp-id',
          userId,
          auditReportId: 'temp-audit-id',
          type: 'other',
          severity: 'high',
          pageUrl: pageUrl,
          title: 'Unreachable Page',
          description: `The page at ${pageUrl} could not be loaded.`,
          recommendation: 'Check that the URL is correct and the page is accessible. Ensure the server is running and not blocking requests.',
          detectedAt: new Date()
        })
        console.error(`Failed to crawl page ${pageUrl}:`, error)
        // Continue with next page
      }
    }
    
    // Check for duplicates across all pages
    const duplicateIssues = detectDuplicates(pageData, userId, 'temp-audit-id')
    issues.push(...duplicateIssues)
    
    return issues
  } catch (error: any) {
    console.error('Error running website audit:', error)
    throw new Error(`Failed to run website audit: ${error.message}`)
  }
}

/**
 * Gets website structure from user ID or domain
 */
async function getWebsiteByUserIdOrDomain(
  userId: string,
  domain: string
): Promise<Website | null> {
  // Try to get published website by domain first
  const published = await getPublishedWebsiteByDomain(domain)
  if (published) return published
  
  // Fallback: try to get by user ID (might be draft)
  const { getWebsiteByUserId } = await import('../../website-builder/src/data')
  return getWebsiteByUserId(userId)
}

/**
 * Gets list of pages to crawl from website structure
 * Includes homepage and all pages from website.pages (main navigation pages)
 */
function getPagesToCrawl(baseUrl: string, website: Website | null): string[] {
  const pages: string[] = []
  const base = baseUrl.replace(/\/$/, '') // Remove trailing slash
  
  // Always include homepage
  pages.push(base)
  
  if (website && website.pages) {
    // Add all pages from website.pages (these are the main navigation pages)
    for (const page of website.pages) {
      if (page.slug === 'home' || page.slug === '') {
        continue // Already added homepage
      }
      // Construct URL from slug
      pages.push(`${base}/${page.slug}`)
    }
  } else {
    // If no website structure available, try common paths as fallback
    pages.push(`${base}/about`)
    pages.push(`${base}/contact`)
    pages.push(`${base}/services`)
  }
  
  return pages
}

/**
 * Crawls and analyzes a single page for SEO issues
 */
async function crawlAndAnalyzePage(
  pageUrl: string,
  userId: string,
  auditReportId: string
): Promise<SeoIssue[]> {
  const issues: SeoIssue[] = []
  
  try {
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NaviAI-SEO-Bot/1.0; +https://naviai.com/bot)'
      },
      signal: AbortSignal.timeout(15000) // 15 second timeout
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    // Extract SEO elements
    const title = $('title').text().trim()
    const metaDesc = $('meta[name="description"]').attr('content') || ''
    const h1 = $('h1').first().text().trim()
    const images = $('img').toArray()
    
    // Check for missing title
    if (!title) {
      issues.push(createIssue(userId, auditReportId, 'on_page', 'high', pageUrl, 
        'Missing Title Tag',
        'This page does not have a title tag.',
        'Add a descriptive title tag (30-65 characters) that includes your main keyword.'
      ))
    } else {
      // Check title length
      if (title.length < 30) {
        issues.push(createIssue(userId, auditReportId, 'on_page', 'medium', pageUrl,
          'Title Too Short',
          `The title tag is only ${title.length} characters. Search engines prefer titles between 30-65 characters.`,
          'Expand the title to at least 30 characters while keeping it under 65 characters.'
        ))
      } else if (title.length > 65) {
        issues.push(createIssue(userId, auditReportId, 'on_page', 'medium', pageUrl,
          'Title Too Long',
          `The title tag is ${title.length} characters. Search engines may truncate titles over 65 characters.`,
          'Shorten the title to 65 characters or less to ensure it displays fully in search results.'
        ))
      }
    }
    
    // Check for missing meta description
    if (!metaDesc) {
      issues.push(createIssue(userId, auditReportId, 'missing_meta', 'high', pageUrl,
        'Missing Meta Description',
        'This page does not have a meta description tag.',
        'Add a compelling meta description (70-160 characters) that summarizes the page content and includes a call-to-action.'
      ))
    } else {
      // Check meta description length
      if (metaDesc.length < 70) {
        issues.push(createIssue(userId, auditReportId, 'missing_meta', 'medium', pageUrl,
          'Meta Description Too Short',
          `The meta description is only ${metaDesc.length} characters. Search engines prefer descriptions between 70-160 characters.`,
          'Expand the meta description to at least 70 characters while keeping it under 160 characters.'
        ))
      } else if (metaDesc.length > 160) {
        issues.push(createIssue(userId, auditReportId, 'missing_meta', 'medium', pageUrl,
          'Meta Description Too Long',
          `The meta description is ${metaDesc.length} characters. Search engines may truncate descriptions over 160 characters.`,
          'Shorten the meta description to 160 characters or less to ensure it displays fully in search results.'
        ))
      }
    }
    
    // Check for missing H1
    if (!h1) {
      issues.push(createIssue(userId, auditReportId, 'on_page', 'high', pageUrl,
        'Missing H1 Tag',
        'This page does not have an H1 heading tag.',
        'Add a single, descriptive H1 tag that clearly describes the main topic of the page.'
      ))
    }
    
    // Check for missing alt text on images
    images.forEach((img, index) => {
      const $img = $(img)
      const alt = $img.attr('alt')
      const src = $img.attr('src') || ''
      
      // Skip decorative images (very small images or spacer images)
      const isDecorative = src.includes('spacer') || src.includes('pixel') || 
                         (parseInt($img.attr('width') || '0') < 10) ||
                         (parseInt($img.attr('height') || '0') < 10)
      
      if (!isDecorative && !alt && alt !== '') {
        issues.push(createIssue(userId, auditReportId, 'on_page', 'medium', pageUrl,
          'Missing Alt Text on Image',
          `Image at ${src || `position ${index + 1}`} is missing alt text.`,
          'Add descriptive alt text to all images. This improves accessibility and helps search engines understand your images.'
        ))
      }
    })
    
    return issues
  } catch (error: any) {
    // Re-throw to be handled by caller
    throw error
  }
}

/**
 * Extracts page data for duplicate detection
 */
async function extractPageData(pageUrl: string): Promise<{
  title?: string
  metaDesc?: string
  h1?: string
}> {
  try {
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NaviAI-SEO-Bot/1.0; +https://naviai.com/bot)'
      },
      signal: AbortSignal.timeout(15000)
    })
    
    if (!response.ok) {
      return {}
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    return {
      title: $('title').text().trim(),
      metaDesc: $('meta[name="description"]').attr('content') || '',
      h1: $('h1').first().text().trim()
    }
  } catch {
    return {}
  }
}

/**
 * Detects duplicate titles and H1s across pages
 */
function detectDuplicates(
  pageData: Array<{ url: string; title?: string; metaDesc?: string; h1?: string }>,
  userId: string,
  auditReportId: string
): SeoIssue[] {
  const issues: SeoIssue[] = []
  
  // Track titles and H1s
  const titleMap = new Map<string, string[]>() // title -> [urls]
  const h1Map = new Map<string, string[]>() // h1 -> [urls]
  
  // Collect all titles and H1s
  for (const page of pageData) {
    if (page.title) {
      const existing = titleMap.get(page.title) || []
      existing.push(page.url)
      titleMap.set(page.title, existing)
    }
    
    if (page.h1) {
      const existing = h1Map.get(page.h1) || []
      existing.push(page.url)
      h1Map.set(page.h1, existing)
    }
  }
  
  // Check for duplicate titles
  for (const [title, urls] of titleMap.entries()) {
    if (urls.length > 1) {
      issues.push(createIssue(userId, auditReportId, 'duplicate_content', 'high', urls.join(', '),
        'Duplicate Title Tags',
        `The title "${title}" is used on ${urls.length} pages: ${urls.join(', ')}`,
        'Each page should have a unique title tag. Create distinct titles for each page that reflect their specific content.'
      ))
    }
  }
  
  // Check for duplicate H1s
  for (const [h1, urls] of h1Map.entries()) {
    if (urls.length > 1) {
      issues.push(createIssue(userId, auditReportId, 'duplicate_content', 'high', urls.join(', '),
        'Duplicate H1 Tags',
        `The H1 "${h1}" is used on ${urls.length} pages: ${urls.join(', ')}`,
        'Each page should have a unique H1 tag. Create distinct headings for each page that reflect their specific content.'
      ))
    }
  }
  
  return issues
}

/**
 * Checks site-wide files (robots.txt, sitemap.xml)
 */
async function checkSiteWideFiles(
  baseUrl: string,
  userId: string,
  auditReportId: string
): Promise<SeoIssue[]> {
  const issues: SeoIssue[] = []
  const urlObj = new URL(baseUrl)
  const base = `${urlObj.protocol}//${urlObj.host}`
  
  // Check robots.txt
  try {
    const robotsUrl = `${base}/robots.txt`
    const robotsResponse = await fetch(robotsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NaviAI-SEO-Bot/1.0)'
      },
      signal: AbortSignal.timeout(5000)
    })
    
    if (!robotsResponse.ok || robotsResponse.status === 404) {
      issues.push(createIssue(userId, auditReportId, 'technical', 'medium', null,
        'Missing robots.txt',
        'No robots.txt file found at the root of your website.',
        'Create a robots.txt file to guide search engine crawlers. This helps prevent important pages from being blocked.'
      ))
    }
  } catch (error) {
    issues.push(createIssue(userId, auditReportId, 'technical', 'medium', null,
      'Missing robots.txt',
      'Could not access robots.txt file.',
      'Create a robots.txt file at the root of your website to guide search engine crawlers.'
    ))
  }
  
  // Check sitemap.xml
  try {
    const sitemapUrl = `${base}/sitemap.xml`
    const sitemapResponse = await fetch(sitemapUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NaviAI-SEO-Bot/1.0)'
      },
      signal: AbortSignal.timeout(5000)
    })
    
    if (!sitemapResponse.ok || sitemapResponse.status === 404) {
      issues.push(createIssue(userId, auditReportId, 'technical', 'medium', null,
        'Missing sitemap.xml',
        'No sitemap.xml file found at the root of your website.',
        'Create a sitemap.xml file to help search engines discover and index all your pages. This is especially important for new websites.'
      ))
    } else {
      // Check if sitemap is valid XML
      const sitemapText = await sitemapResponse.text()
      try {
        const $ = cheerio.load(sitemapText, { xmlMode: true })
        // Basic validation - check if it has urlset or sitemapindex
        if (!$('urlset').length && !$('sitemapindex').length) {
          issues.push(createIssue(userId, auditReportId, 'technical', 'medium', null,
            'Invalid sitemap.xml',
            'The sitemap.xml file exists but does not appear to be valid XML.',
            'Ensure your sitemap.xml follows the XML sitemap protocol. Check for syntax errors or missing required elements.'
          ))
        }
      } catch (parseError) {
        issues.push(createIssue(userId, auditReportId, 'technical', 'medium', null,
          'Invalid sitemap.xml',
          'The sitemap.xml file exists but could not be parsed.',
          'Fix XML syntax errors in your sitemap.xml file. Ensure it follows the sitemap protocol.'
        ))
      }
    }
  } catch (error) {
    issues.push(createIssue(userId, auditReportId, 'technical', 'medium', null,
      'Missing sitemap.xml',
      'Could not access sitemap.xml file.',
      'Create a sitemap.xml file at the root of your website to help search engines discover your pages.'
    ))
  }
  
  return issues
}

/**
 * Helper function to create SEO issues
 */
function createIssue(
  userId: string,
  auditReportId: string,
  type: SeoIssueType,
  severity: SeoIssueSeverity,
  pageUrl: string | null,
  title: string,
  description: string,
  recommendation: string
): SeoIssue {
  return {
    id: 'temp-id', // Will be replaced when saved to DB
    userId,
    auditReportId,
    type,
    severity,
    pageUrl: pageUrl || null,
    title,
    description,
    recommendation,
    detectedAt: new Date()
  }
}

/**
 * Normalizes URL to ensure it has protocol
 */
function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`
  }
  return url
}

