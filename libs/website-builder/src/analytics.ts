/**
 * Analytics Integration with Plausible API
 * Fetches analytics data for chat integration
 */

export interface AnalyticsSummary {
  visitors: number
  pageViews: number
  topPages: Array<{ path: string; visitors: number }>
  topReferrers: Array<{ source: string; visitors: number }>
  period: string
}

/**
 * Fetches analytics summary from Plausible API
 * @param apiKey - Plausible API key
 * @param domain - Website domain to query
 * @param period - Time period (default: '7d' for last 7 days)
 */
export async function getAnalyticsSummary(
  apiKey: string,
  domain: string,
  period: string = '7d'
): Promise<AnalyticsSummary> {
  const baseUrl = 'https://plausible.io/api/v1'
  
  // Get current date and calculate period start
  const endDate = new Date().toISOString().split('T')[0]
  let startDate: string
  
  if (period === '7d') {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    startDate = date.toISOString().split('T')[0]
  } else if (period === '30d') {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    startDate = date.toISOString().split('T')[0]
  } else {
    // Default to 7 days
    const date = new Date()
    date.setDate(date.getDate() - 7)
    startDate = date.toISOString().split('T')[0]
  }

  try {
    // Fetch aggregate stats (visitors, page views)
    const statsResponse = await fetch(
      `${baseUrl}/stats/aggregate?site_id=${domain}&period=day&date=${startDate},${endDate}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!statsResponse.ok) {
      throw new Error(`Plausible API error: ${statsResponse.status} ${statsResponse.statusText}`)
    }

    const statsData = await statsResponse.json()

    // Fetch top pages
    const pagesResponse = await fetch(
      `${baseUrl}/stats/breakdown?site_id=${domain}&property=event:page&period=day&date=${startDate},${endDate}&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!pagesResponse.ok) {
      throw new Error(`Plausible API error: ${pagesResponse.status}`)
    }

    const pagesData = await pagesResponse.json()

    // Fetch top referrers
    const referrersResponse = await fetch(
      `${baseUrl}/stats/breakdown?site_id=${domain}&property=visit:source&period=day&date=${startDate},${endDate}&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!referrersResponse.ok) {
      throw new Error(`Plausible API error: ${referrersResponse.status}`)
    }

    const referrersData = await referrersResponse.json()

    return {
      visitors: statsData.results?.visitors?.value || 0,
      pageViews: statsData.results?.pageviews?.value || 0,
      topPages: (pagesData.results || []).map((item: any) => ({
        path: item.page || item.name || '',
        visitors: item.visitors || 0
      })),
      topReferrers: (referrersData.results || []).map((item: any) => ({
        source: item.source || item.name || 'Direct',
        visitors: item.visitors || 0
      })),
      period
    }
  } catch (error: any) {
    throw new Error(`Failed to fetch analytics: ${error.message}`)
  }
}

