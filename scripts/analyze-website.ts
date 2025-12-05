#!/usr/bin/env tsx
/**
 * Website Analysis Script
 * Analyzes a website for business profile information and SEO health
 * Run with: tsx scripts/analyze-website.ts
 */

import * as cheerio from 'cheerio'

const WEBSITE_URL = 'https://angellimo.com'

interface BasicSEOAnalysis {
  title: string | null
  metaDescription: string | null
  h1: string | null
  h2Count: number
  imageCount: number
  imagesWithoutAlt: number
  hasRobotsTxt: boolean
  hasSitemap: boolean
  pageLoadTime: number
  statusCode: number
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
    console.log(`   Status Code: ${seoAnalysis.statusCode}`)
    console.log(`   Page Load Time: ${seoAnalysis.pageLoadTime}ms`)
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
    console.log(`   H2 Tags: ${seoAnalysis.h2Count} found`)
    console.log(`   Images: ${seoAnalysis.imageCount} total, ${seoAnalysis.imagesWithoutAlt} without alt text`)
    if (seoAnalysis.imagesWithoutAlt > 0) {
      console.log(`     ⚠️  ${seoAnalysis.imagesWithoutAlt} images missing alt text`)
    }
    
    console.log(`   robots.txt: ${seoAnalysis.hasRobotsTxt ? '✅ Found' : '❌ Missing'}`)
    console.log(`   sitemap.xml: ${seoAnalysis.hasSitemap ? '✅ Found' : '❌ Missing'}`)
    
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
    
    if (seoAnalysis.imagesWithoutAlt > 0) issues.push(`${seoAnalysis.imagesWithoutAlt} images missing alt text`)
    
    if (!seoAnalysis.hasRobotsTxt) {
      issues.push('Missing robots.txt')
      recommendations.push('Create a robots.txt file to guide search engine crawlers')
    }
    
    if (!seoAnalysis.hasSitemap) {
      issues.push('Missing sitemap.xml')
      recommendations.push('Create a sitemap.xml file to help search engines discover your pages')
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

async function performBasicSEOAnalysis(url: string): Promise<BasicSEOAnalysis> {
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
  
  const title = $('title').text().trim() || null
  const metaDescription = $('meta[name="description"]').attr('content') || null
  const h1 = $('h1').first().text().trim() || null
  const h2Count = $('h2').length
  const images = $('img').toArray()
  const imageCount = images.length
  
  let imagesWithoutAlt = 0
  images.forEach((img) => {
    const $img = $(img)
    const alt = $img.attr('alt')
    const src = $img.attr('src') || ''
    const isDecorative = src.includes('spacer') || src.includes('pixel') || 
                       (parseInt($img.attr('width') || '0') < 10) ||
                       (parseInt($img.attr('height') || '0') < 10)
    
    if (!isDecorative && (!alt || alt === '')) {
      imagesWithoutAlt++
    }
  })
  
  // Check robots.txt
  const urlObj = new URL(url)
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
  
  // Check sitemap.xml
  let hasSitemap = false
  try {
    const sitemapResponse = await fetch(`${base}/sitemap.xml`, {
      signal: AbortSignal.timeout(5000)
    })
    hasSitemap = sitemapResponse.ok && sitemapResponse.status !== 404
  } catch {
    hasSitemap = false
  }
  
  return {
    title,
    metaDescription,
    h1,
    h2Count,
    imageCount,
    imagesWithoutAlt,
    hasRobotsTxt,
    hasSitemap,
    pageLoadTime,
    statusCode
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
  
  if (seoAnalysis.imagesWithoutAlt > 0) {
    const altPenalty = Math.min(seoAnalysis.imagesWithoutAlt * 2, 15)
    score -= altPenalty
  }
  
  if (!seoAnalysis.hasRobotsTxt) score -= 5
  if (!seoAnalysis.hasSitemap) score -= 5
  
  // Performance penalty
  if (seoAnalysis.pageLoadTime > 3000) score -= 10
  else if (seoAnalysis.pageLoadTime > 2000) score -= 5
  
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
 * This is the main export for use in API routes
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
  
  // Extract text content (remove scripts, styles, etc.)
  $('script, style, noscript').remove()
  const text = $('body').text().replace(/\s+/g, ' ').trim()
  
  // Extract meta tags
  const title = $('title').text().trim() || null
  const metaDescription = $('meta[name="description"]').attr('content') || null
  const metaKeywords = $('meta[name="keywords"]').attr('content') || null
  
  // Extract headings
  const h1 = $('h1').first().text().trim() || null
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
  
  // Extract links
  const links: string[] = []
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (href) {
      try {
        // Resolve relative URLs
        const absoluteUrl = new URL(href, url).href
        links.push(absoluteUrl)
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
  
  // Check robots.txt and sitemap.xml
  const urlObj = new URL(url)
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
  
  return {
    url,
    html,
    text,
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
    hasSitemap
  }
}

export { analyzeWebsite }

