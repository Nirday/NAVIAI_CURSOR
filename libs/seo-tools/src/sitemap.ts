/**
 * SEO Tools: Sitemap generation and search engine ping utilities
 */

/**
 * Pings Google and Bing search engines to notify them of sitemap updates
 * @param sitemapUrl Full URL to the sitemap.xml (e.g., https://example.com/sitemap.xml)
 */
export async function pingSearchEngines(sitemapUrl: string): Promise<void> {
  const pingUrls = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
  ]

  const results = await Promise.allSettled(
    pingUrls.map(async (url) => {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Navi-AI/1.0',
        },
      })
      if (!response.ok) {
        throw new Error(`Ping failed: ${response.status} ${response.statusText}`)
      }
      return response
    })
  )

  // Log failures but don't throw - pinging is best-effort
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const engine = index === 0 ? 'Google' : 'Bing'
      console.warn(`Failed to ping ${engine}:`, result.reason)
    }
  })
}

