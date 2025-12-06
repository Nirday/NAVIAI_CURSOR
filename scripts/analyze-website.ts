#!/usr/bin/env tsx
/**
 * Website Analysis Script
 * Analyzes a website for business profile information and SEO health
 * Run with: tsx scripts/analyze-website.ts
 */

import * as cheerio from 'cheerio'

const WEBSITE_URL = 'https://angellimo.com'

interface BasicSEOAnalysis {
  url: string
  title: string | null
  metaDescription: string | null
  h1: string | null
  body_text: string
  technical: {
    schema: any | null
    mobile_friendly: boolean
    copyright_year: string | null
  }
  contacts: {
    phones: string[]
    emails: string[]
    socials: string[]
    address_text: string
  }
}

export interface WebsiteScrapeData {
  url: string
  html: string
  text: string
  title: string | null
  metaDescription: string | null
  metaKeywords: string | null
  h1: string | null
  h2s: string[]
  h3s: string[]
  links: string[]
  images: Array<{ src: string; alt: string | null }>
  statusCode: number
  pageLoadTime: number
  hasRobotsTxt: boolean
  hasSitemap: boolean
  rawText: string
  mainContent: string // Body text, cleaned, limited to 15k chars
  contact_signals: {
    emails: string[]
    phones: string[]
    socials: string[]
    address_text: string
  }
  tech_xray: {
    schema_found: boolean
    schema_types: string[]
    heading_structure: string[]
    copyright_year: string
    mobile_viewport: boolean
    internal_links_count: number
    external_links_count: number
  }
}

async function analyzeWebsite(url: string) {
  console.log(`\n🔍 Analyzing: ${url}\n`)
  console.log('='.repeat(80))
  
  try {
    // Step 1: SEO Analysis
    console.log('\n🔎 SEO Health Analysis...')
    console.log('-'.repeat(80))
    
    const seoAnalysis = await performBasicSEOAnalysis(url)
    
    console.log('\n✅ SEO Analysis Results:')
    console.log(`   URL: ${seoAnalysis.url}`)
    console.log(`   Title Tag: ${seoAnalysis.title || '❌ MISSING'}`)
    if (seoAnalysis.title) {
      const titleLength = seoAnalysis.title.length
      if (titleLength < 30) {
        console.log(`     ⚠️  Title too short (${titleLength} chars, recommended: 30-65)`)
      } else if (titleLength > 65) {
        console.log(`     ⚠️  Title too long (${titleLength} chars, recommended: 30-65)`)
      } else {
        console.log(`     ✅ Title length OK (${titleLength} chars)`)
      }
    }
    
    console.log(`   Meta Description: ${seoAnalysis.metaDescription || '❌ MISSING'}`)
    if (seoAnalysis.metaDescription) {
      const descLength = seoAnalysis.metaDescription.length
      if (descLength < 70) {
        console.log(`     ⚠️  Description too short (${descLength} chars, recommended: 70-160)`)
      } else if (descLength > 160) {
        console.log(`     ⚠️  Description too long (${descLength} chars, recommended: 70-160)`)
      } else {
        console.log(`     ✅ Description length OK (${descLength} chars)`)
      }
    }
    
    console.log(`   H1 Tag: ${seoAnalysis.h1 || '❌ MISSING'}`)
    console.log(`   Body Text Length: ${seoAnalysis.body_text.length} chars`)
    
    // Technical X-Ray Data
    console.log(`\n   🔬 Technical X-Ray:`)
    console.log(`     Schema: ${seoAnalysis.technical.schema ? '✅ Found' : '❌ Missing'}`)
    console.log(`     Mobile Friendly: ${seoAnalysis.technical.mobile_friendly ? '✅ Yes' : '❌ No'}`)
    console.log(`     Copyright Year: ${seoAnalysis.technical.copyright_year || 'Unknown'}`)
    
    // Contact Signals
    console.log(`\n   📞 Contact Signals:`)
    console.log(`     Phones: ${seoAnalysis.contacts.phones.length} found`)
    if (seoAnalysis.contacts.phones.length > 0) {
      seoAnalysis.contacts.phones.forEach((phone, idx) => {
        console.log(`       ${idx + 1}. ${phone}`)
      })
    }
    console.log(`     Emails: ${seoAnalysis.contacts.emails.length} found`)
    if (seoAnalysis.contacts.emails.length > 0) {
      seoAnalysis.contacts.emails.forEach((email, idx) => {
        console.log(`       ${idx + 1}. ${email}`)
      })
    }
    console.log(`     Social Links: ${seoAnalysis.contacts.socials.length} found`)
    if (seoAnalysis.contacts.socials.length > 0) {
      seoAnalysis.contacts.socials.forEach((social, idx) => {
        console.log(`       ${idx + 1}. ${social}`)
      })
    }
    if (seoAnalysis.contacts.address_text) {
      console.log(`     Address Text: ${seoAnalysis.contacts.address_text.substring(0, 100)}...`)
    }
    
    // Step 2: Summary
    console.log('\n\n📊 Analysis Summary...')
    console.log('-'.repeat(80))
    
    const issues: string[] = []
    const recommendations: string[] = []
    
    if (!seoAnalysis.title) issues.push('Missing title tag')
    else if (seoAnalysis.title.length < 30 || seoAnalysis.title.length > 65) {
      issues.push('Title tag length issue')
    }
    
    if (!seoAnalysis.metaDescription) issues.push('Missing meta description')
    else if (seoAnalysis.metaDescription.length < 70 || seoAnalysis.metaDescription.length > 160) {
      issues.push('Meta description length issue')
    }
    
    if (!seoAnalysis.h1) issues.push('Missing H1 tag')
    
    if (!seoAnalysis.technical.schema) {
      issues.push('Missing JSON-LD schema')
      recommendations.push('Add structured data (JSON-LD) to improve SEO and rich snippets')
    }
    
    if (!seoAnalysis.technical.mobile_friendly) {
      issues.push('Missing mobile viewport meta tag')
      recommendations.push('Add viewport meta tag for mobile responsiveness')
    }
    
    if (seoAnalysis.contacts.phones.length === 0 && seoAnalysis.contacts.emails.length === 0) {
      issues.push('No contact information found')
      recommendations.push('Add phone numbers or email addresses to improve local SEO')
    }
    
    console.log(`\n📈 Overall Health Score: ${calculateHealthScore(issues, seoAnalysis)}/100`)
    console.log(`\n⚠️  Issues Found: ${issues.length}`)
    if (issues.length > 0) {
      issues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue}`)
      })
    }
    
    if (recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`)
      recommendations.forEach((rec, idx) => {
        console.log(`   ${idx + 1}. ${rec}`)
      })
    }
    
    console.log('\n' + '='.repeat(80))
    console.log('✅ Analysis Complete!\n')
    
  } catch (error: any) {
    console.error('\n❌ Error analyzing website:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

export async function performBasicSEOAnalysis(url: string): Promise<BasicSEOAnalysis> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NaviAI-Analysis-Bot/1.0; +https://naviai.com/bot)'
    },
    signal: AbortSignal.timeout(30000)
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  const html = await response.text()
  const $ = cheerio.load(html)
  
  // 1. Extract Schema: Find script[type="application/ld+json"] and parse it
  let schemaData: any | null = null
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const schemaText = $(el).html()
      if (schemaText) {
        const parsed = JSON.parse(schemaText)
        // If multiple schemas, use the first one or combine them
        if (!schemaData) {
          schemaData = parsed
        } else if (Array.isArray(schemaData)) {
          schemaData.push(parsed)
        } else {
          schemaData = [schemaData, parsed]
        }
      }
    } catch (e) {
      // Skip invalid JSON
    }
  })
  
  // 2. Extract Viewport: Check meta[name="viewport"] to calculate mobile_friendly boolean
  const mobile_friendly = !!$('meta[name="viewport"]').attr('content')
  
  // 3. Regex Hunting for emails and phones
  const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g
  const phoneRegex = /(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})/g
  
  // Extract emails
  const emailsFromLinks: string[] = []
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href')
    if (href) {
      const email = href.replace(/^mailto:/i, '').split('?')[0].trim()
      if (email && email.includes('@')) {
        emailsFromLinks.push(email.toLowerCase())
      }
    }
  })
  const emailsFromText = (html.match(emailRegex) || []).map(e => e.toLowerCase())
  const uniqueEmails = Array.from(new Set([...emailsFromLinks, ...emailsFromText]))
  
  // Extract phones - specifically check footer and a[href^="tel:"]
  const phonesFromTel: string[] = []
  $('a[href^="tel:"]').each((_, el) => {
    const href = $(el).attr('href')
    if (href) {
      const phone = href.replace(/^tel:/i, '').trim()
      if (phone) {
        phonesFromTel.push(phone)
      }
    }
  })
  
  const footerText = $('footer').text()
  const phonesFromFooter = (footerText.match(phoneRegex) || [])
  const phonesFromText = (html.match(phoneRegex) || [])
  const uniquePhones = Array.from(new Set([...phonesFromTel, ...phonesFromFooter, ...phonesFromText]))
  
  // Extract social media links
  const uniqueSocials: string[] = []
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (href) {
      const lowerHref = href.toLowerCase()
      if (
        lowerHref.includes('facebook.com') ||
        lowerHref.includes('instagram.com') ||
        lowerHref.includes('linkedin.com') ||
        lowerHref.includes('twitter.com') ||
        lowerHref.includes('x.com') ||
        lowerHref.includes('yelp.com') ||
        lowerHref.includes('tiktok.com') ||
        lowerHref.includes('youtube.com')
      ) {
        try {
          const absoluteUrl = new URL(href, url).href
          if (!uniqueSocials.includes(absoluteUrl)) {
            uniqueSocials.push(absoluteUrl)
          }
        } catch {
          // Skip invalid URLs
        }
      }
    }
  })
  
  // 4. Copyright Check: Regex the footer for 202[0-9] to determine copyright_year
  const copyrightYear = footerText.match(/202[0-9]/)?.[0] || null
  
  // Extract basic SEO elements
  const title = $('title').text().trim() || null
  const metaDescription = $('meta[name="description"]').attr('content') || null
  const h1 = $('h1').first().text().trim() || null
  const body_text = $('body').text().replace(/\s+/g, ' ').substring(0, 15000)
  
  // Extract footer text for address context (limited to 500 chars)
  const address_text = $('footer').text().substring(0, 500)
  
  return {
    url,
    title,
    metaDescription,
    h1,
    body_text,
    technical: {
      schema: schemaData || null,
      mobile_friendly,
      copyright_year: copyrightYear
    },
    contacts: {
      phones: uniquePhones,
      emails: uniqueEmails,
      socials: uniqueSocials,
      address_text
    }
  }
}

function calculateHealthScore(issues: string[], seoAnalysis: BasicSEOAnalysis): number {
  let score = 100
  
  // Deduct points for each issue
  if (!seoAnalysis.title) score -= 15
  else if (seoAnalysis.title.length < 30 || seoAnalysis.title.length > 65) score -= 5
  
  if (!seoAnalysis.metaDescription) score -= 15
  else if (seoAnalysis.metaDescription.length < 70 || seoAnalysis.metaDescription.length > 160) score -= 5
  
  if (!seoAnalysis.h1) score -= 10
  
  if (!seoAnalysis.technical.schema) score -= 10
  
  if (!seoAnalysis.technical.mobile_friendly) score -= 10
  
  if (seoAnalysis.contacts.phones.length === 0 && seoAnalysis.contacts.emails.length === 0) score -= 10
  
  return Math.max(0, score)
}

// Run the analysis
if (require.main === module) {
  analyzeWebsite(WEBSITE_URL)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

/**
 * Scrapes a website and returns comprehensive data for LLM analysis
 * "Sherlock Holmes" extraction logic - hunts for hidden data like a detective
 * This is the main export for use in API routes
 * 
 * Returns structured object with contact_signals for deep business analysis
 */
export async function scrapeWebsiteForProfile(url: string): Promise<WebsiteScrapeData> {
  const startTime = Date.now()
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NaviAI-Analysis-Bot/1.0; +https://naviai.com/bot)'
    },
    signal: AbortSignal.timeout(30000)
  })
  
  const pageLoadTime = Date.now() - startTime
  const statusCode = response.status
  
  if (!response.ok) {
    throw new Error(`HTTP ${statusCode}: ${response.statusText}`)
  }
  
  const html = await response.text()
  const $ = cheerio.load(html)
  
  // ===== X-RAY MODE: Extract Technical Data Before Removing Scripts =====
  
  // Extract JSON-LD Schema (crucial for LocalBusiness SEO)
  const schemaData: any[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const schemaText = $(el).html()
      if (schemaText) {
        const parsed = JSON.parse(schemaText)
        schemaData.push(parsed)
      }
    } catch (e) {
      // Skip invalid JSON
    }
  })
  
  // Extract heading hierarchy (H1-H6 full tree)
  const headingStructure: string[] = []
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const $el = $(el)
    const tag = $el.prop('tagName')?.toLowerCase() || 'unknown'
    const text = $el.text().trim()
    if (text) {
      headingStructure.push(`${tag}: ${text}`)
    }
  })
  
  // Extract copyright year from footer (detect staleness)
  const footerTextForCopyright = $('footer').text()
  const copyrightMatch = footerTextForCopyright.match(/20[0-9]{2}/)
  const copyrightYear = copyrightMatch ? copyrightMatch[0] : 'Unknown'
  
  // Check mobile viewport (mobile ready check)
  const mobileViewport = !!$('meta[name="viewport"]').attr('content')
  
  // ===== END X-RAY MODE =====
  
  // Remove scripts, styles, noscript for clean text extraction
  $('script, style, noscript').remove()
  
  // Extract meta data
  const title = $('title').text().trim() || null
  const metaDescription = $('meta[name="description"]').attr('content') || null
  const metaKeywords = $('meta[name="keywords"]').attr('content') || null
  
  // Extract H1
  const h1 = $('h1').first().text().trim() || null
  
  // Extract main content (body text, cleaned, limited to 15k chars)
  const mainContent = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 15000)
  
  // Extract headings for context
  const h2s: string[] = []
  $('h2').each((_, el) => {
    const text = $(el).text().trim()
    if (text) h2s.push(text)
  })
  
  const h3s: string[] = []
  $('h3').each((_, el) => {
    const text = $(el).text().trim()
    if (text) h3s.push(text)
  })
  
  // Extract links and categorize (internal vs external - signals Authority vs Leakage)
  const links: string[] = []
  let internalLinksCount = 0
  let externalLinksCount = 0
  const urlObj = new URL(url)
  const baseHostname = urlObj.hostname
  
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (href) {
      try {
        const absoluteUrl = new URL(href, url).href
        links.push(absoluteUrl)
        
        // Categorize as internal or external
        const linkUrl = new URL(absoluteUrl)
        if (linkUrl.hostname === baseHostname || linkUrl.hostname === '') {
          internalLinksCount++
        } else {
          externalLinksCount++
        }
      } catch {
        // Skip invalid URLs
      }
    }
  })
  
  // Extract images
  const images: Array<{ src: string; alt: string | null }> = []
  $('img').each((_, el) => {
    const src = $(el).attr('src')
    const alt = $(el).attr('alt') || null
    if (src) {
      try {
        const absoluteUrl = new URL(src, url).href
        images.push({ src: absoluteUrl, alt })
      } catch {
        // Skip invalid URLs
      }
    }
  })
  
  // ===== SHERLOCK HOLMES EXTRACTION: Phone/Email Hunting =====
  
  // Extract emails from mailto: links (DOM search - primary method)
  const emailsFromMailto: string[] = []
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href')
    if (href) {
      // Extract raw value from mailto: link
      const email = href.replace(/^mailto:/i, '').split('?')[0].trim()
      if (email && email.includes('@')) {
        emailsFromMailto.push(email.toLowerCase())
      }
    }
  })
  
  // Extract emails from text using regex (secondary method)
  const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/gi
  const emailsFromText = (html.match(emailRegex) || []).map(e => e.toLowerCase())
  
  // Combine and deduplicate emails
  const allEmails = Array.from(new Set([...emailsFromMailto, ...emailsFromText]))
  
  // Extract phones from tel: links (DOM search - primary method)
  const phonesFromTel: string[] = []
  $('a[href^="tel:"]').each((_, el) => {
    const href = $(el).attr('href')
    if (href) {
      // Extract raw value from tel: link (e.g., tel:+15105550199)
      const phone = href.replace(/^tel:/i, '').trim()
      if (phone) {
        phonesFromTel.push(phone)
      }
    }
  })
  
  // Extract phones from header and footer specifically (secondary method)
  const headerText = $('header').text()
  const footerText = $('footer').text()
  const phoneRegex = /(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})/g
  const phonesFromHeader = (headerText.match(phoneRegex) || [])
  const phonesFromFooter = (footerText.match(phoneRegex) || [])
  
  // Also check general text for phone patterns
  const phonesFromText = (html.match(phoneRegex) || [])
  
  // Combine and deduplicate phones
  const allPhones = Array.from(new Set([
    ...phonesFromTel,
    ...phonesFromHeader,
    ...phonesFromFooter,
    ...phonesFromText
  ]))
  
  // Extract social media links (scan all hrefs)
  const socials: string[] = []
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (href) {
      const lowerHref = href.toLowerCase()
      if (
        lowerHref.includes('facebook.com') ||
        lowerHref.includes('instagram.com') ||
        lowerHref.includes('linkedin.com') ||
        lowerHref.includes('yelp.com')
      ) {
        try {
          const absoluteUrl = new URL(href, url).href
          if (!socials.includes(absoluteUrl)) {
            socials.push(absoluteUrl)
          }
        } catch {
          // Skip invalid URLs
        }
      }
    }
  })
  
  // Extract footer text explicitly (where physical addresses usually live)
  const footerTextCleaned = footerText.replace(/\s+/g, ' ').trim()
  
  // ===== END SHERLOCK HOLMES EXTRACTION =====
  
  // Check robots.txt and sitemap.xml
  const base = `${urlObj.protocol}//${urlObj.host}`
  
  let hasRobotsTxt = false
  try {
    const robotsResponse = await fetch(`${base}/robots.txt`, {
      signal: AbortSignal.timeout(5000)
    })
    hasRobotsTxt = robotsResponse.ok && robotsResponse.status !== 404
  } catch {
    hasRobotsTxt = false
  }
  
  let hasSitemap = false
  try {
    const sitemapResponse = await fetch(`${base}/sitemap.xml`, {
      signal: AbortSignal.timeout(5000)
    })
    hasSitemap = sitemapResponse.ok && sitemapResponse.status !== 404
  } catch {
    hasSitemap = false
  }
  
  // Return structured object for "God Mode" deep business analysis
  return {
    url,
    html,
    text: mainContent, // Keep for backward compatibility
    title,
    metaDescription,
    metaKeywords,
    h1,
    h2s,
    h3s,
    links,
    images,
    statusCode,
    pageLoadTime,
    hasRobotsTxt,
    hasSitemap,
    rawText: mainContent, // Main content limited to 15k chars
    mainContent, // Body text, cleaned, limited to 15k chars
    contact_signals: {
      emails: allEmails,
      phones: allPhones,
      socials,
      address_text: footerTextCleaned // Explicit footer text for address analysis
    },
    tech_xray: {
      schema_found: schemaData.length > 0,
      schema_types: schemaData.map(s => s['@type'] || 'Unknown').filter(Boolean),
      heading_structure: headingStructure,
      copyright_year: copyrightYear,
      mobile_viewport: mobileViewport,
      internal_links_count: internalLinksCount,
      external_links_count: externalLinksCount
    }
  }
}

export { analyzeWebsite }

